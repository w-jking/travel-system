import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

type ScanAlertInput = {
  days?: number;
};

type ListAlertInput = {
  ruleCode?: string;
  status?: string;
  actorUuid?: string;
  from?: string;
  to?: string;
};

type ResolveAlertInput = {
  alertUuid: string;
};

const CANCEL_THRESHOLD = 3;
const OFFLINE_THRESHOLD = 1;
const NIGHT_THRESHOLD = 5;
const DEFAULT_DAYS = 7;

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) { }

  async list(roleCode: string, userUuid: string, input: ListAlertInput) {
    const where: {
      ruleCode?: string;
      status?: string;
      actorUuid?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (roleCode === "staff") {
      where.actorUuid = userUuid;
    } else if (input.actorUuid) {
      where.actorUuid = input.actorUuid;
    }

    if (input.ruleCode) {
      where.ruleCode = input.ruleCode;
    }

    if (input.status) {
      where.status = input.status;
    }

    if (input.from || input.to) {
      where.createdAt = {
        gte: input.from ? new Date(input.from) : undefined,
        lte: input.to ? new Date(input.to) : undefined
      };
    }

    return this.prisma.alert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: {
            employeeUuid: true,
            name: true,
            department: true,
            position: true,
            roleUuid: true
          }
        }
      }
    });
  }

  async scan(actorUuid: string, input: ScanAlertInput) {
    const days = input.days ?? DEFAULT_DAYS;
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const end = new Date();
    const created: any[] = [];

    const cancelGroups = await this.prisma.order.groupBy({
      by: ["ownerUuid"],
      where: {
        status: "已取消",
        updatedAt: { gte: start, lte: end }
      },
      _count: { _all: true }
    });

    for (const group of cancelGroups) {
      if (group._count._all < CANCEL_THRESHOLD) {
        continue;
      }
      const alert = await this.createIfNotExists({
        ruleCode: "cancel_spike",
        summary: `近${days}天取消订单${group._count._all}笔`,
        actorUuid: group.ownerUuid,
        meta: { count: group._count._all, days }
      }, start);
      if (alert) {
        created.push(alert);
      }
    }

    const offlineGroups = await this.prisma.order.groupBy({
      by: ["ownerUuid"],
      where: {
        payee: { contains: "线下" },
        createdAt: { gte: start, lte: end }
      },
      _count: { _all: true }
    });

    for (const group of offlineGroups) {
      if (group._count._all < OFFLINE_THRESHOLD) {
        continue;
      }
      const alert = await this.createIfNotExists({
        ruleCode: "offline_payee",
        summary: `近${days}天线下收款订单${group._count._all}笔`,
        actorUuid: group.ownerUuid,
        meta: { count: group._count._all, days }
      }, start);
      if (alert) {
        created.push(alert);
      }
    }

    const logs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        OR: [
          { action: { startsWith: "order." } },
          { action: { startsWith: "customer." } }
        ]
      }
    });

    const nightCounts = new Map<string, number>();
    for (const log of logs) {
      const hour = new Date(log.createdAt).getHours();
      if (hour >= 22 || hour < 6) {
        nightCounts.set(log.actorUuid, (nightCounts.get(log.actorUuid) ?? 0) + 1);
      }
    }

    for (const [ownerUuid, count] of nightCounts) {
      if (count < NIGHT_THRESHOLD) {
        continue;
      }
      const alert = await this.createIfNotExists({
        ruleCode: "night_ops",
        summary: `非工作时段敏感操作${count}次`,
        actorUuid: ownerUuid,
        meta: { count, days }
      }, start);
      if (alert) {
        created.push(alert);
      }
    }

    await this.logAction(actorUuid, "alert.scan", "alert", actorUuid, null, { created: created.length });
    return created;
  }

  async resolve(actorUuid: string, input: ResolveAlertInput) {
    const before = await this.prisma.alert.findUnique({ where: { alertUuid: input.alertUuid } });
    if (!before) {
      throw new BadRequestException("alert not found");
    }
    const updated = await this.prisma.alert.update({
      where: { alertUuid: input.alertUuid },
      data: { status: "已处理" },
      include: {
        actor: {
          select: {
            employeeUuid: true,
            name: true,
            department: true,
            position: true,
            roleUuid: true
          }
        }
      }
    });
    await this.logAction(actorUuid, "alert.resolve", "alert", input.alertUuid, before, updated);
    return updated;
  }

  private async createIfNotExists(
    input: { ruleCode: string; summary: string; actorUuid?: string | null; meta?: any },
    windowStart: Date
  ) {
    const existing = await this.prisma.alert.findFirst({
      where: {
        ruleCode: input.ruleCode,
        actorUuid: input.actorUuid ?? undefined,
        status: "待处理",
        createdAt: { gte: windowStart }
      }
    });
    if (existing) {
      return null;
    }
    const created = await this.prisma.alert.create({
      data: {
        ruleCode: input.ruleCode,
        summary: input.summary,
        status: "待处理",
        actor: input.actorUuid ? { connect: { employeeUuid: input.actorUuid } } : undefined,
        meta: input.meta ? JSON.parse(JSON.stringify(input.meta)) : undefined
      },
      include: {
        actor: {
          select: {
            employeeUuid: true,
            name: true,
            department: true,
            position: true,
            roleUuid: true
          }
        }
      }
    });
    return created;
  }

  private async logAction(
    actorUuid: string,
    action: string,
    targetType: string,
    targetUuid: string,
    beforeData: unknown,
    afterData: unknown
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUuid,
        action,
        targetType,
        targetUuid,
        summary: action,
        beforeData: beforeData ? JSON.parse(JSON.stringify(beforeData)) : undefined,
        afterData: afterData ? JSON.parse(JSON.stringify(afterData)) : undefined
      }
    });
  }
}
