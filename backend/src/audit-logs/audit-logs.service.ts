import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

type ListAuditLogInput = {
  actorUuid?: string;
  targetType?: string;
  targetUuid?: string;
  action?: string;
  from?: string;
  to?: string;
  keyword?: string;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(roleCode: string, userUuid: string, input: ListAuditLogInput) {
    const where: {
      actorUuid?: string;
      targetType?: string;
      targetUuid?: string;
      action?: string;
      createdAt?: { gte?: Date; lte?: Date };
      summary?: { contains: string; mode: "insensitive" };
      actor?: { department?: string };
    } = {};

    if (roleCode === "staff") {
      where.actorUuid = userUuid;
    } else if (roleCode === "manager") {
      where.actor = { department: await this.getActorDepartment(userUuid) };
    } else if (input.actorUuid) {
      where.actorUuid = input.actorUuid;
    }

    if (input.targetType) {
      where.targetType = input.targetType;
    }

    if (input.targetUuid) {
      where.targetUuid = input.targetUuid;
    }

    if (input.action) {
      where.action = input.action;
    }

    if (input.from || input.to) {
      where.createdAt = {
        gte: input.from ? new Date(input.from) : undefined,
        lte: input.to ? new Date(input.to) : undefined
      };
    }

    if (input.keyword) {
      where.summary = { contains: input.keyword, mode: "insensitive" };
    }

    return this.prisma.auditLog.findMany({
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

  private async getActorDepartment(actorUuid: string) {
    const actor = await this.prisma.employee.findUnique({
      where: { employeeUuid: actorUuid },
      select: { department: true }
    });
    if (!actor?.department) {
      throw new BadRequestException("actor not found");
    }
    return actor.department;
  }
}
