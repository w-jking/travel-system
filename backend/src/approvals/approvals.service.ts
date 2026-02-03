import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

type RequestRefundInput = {
  orderUuid: string;
  comment?: string;
};

type ReviewRefundInput = {
  refundApprovalUuid: string;
  comment?: string;
};

type RequestExportInput = {
  scope: string;
  comment?: string;
};

type ReviewExportInput = {
  exportApprovalUuid: string;
  comment?: string;
};

type RequestOrderApprovalInput = {
  orderUuid: string;
  comment?: string;
};

type ReviewOrderApprovalInput = {
  orderApprovalUuid: string;
  comment?: string;
};

const EXPORT_RESOURCES = ["employee", "customer"];

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) { }

  async listRefunds(roleCode: string, userUuid: string) {
    const where = roleCode === "staff" ? { requesterUuid: userUuid } : undefined;
    return this.prisma.refundApproval.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      include: { order: true, requester: true, reviewer: true }
    });
  }

  async requestRefund(roleCode: string, actorUuid: string, input: RequestRefundInput) {
    const order = await this.prisma.order.findUnique({ where: { orderUuid: input.orderUuid } });
    if (!order) {
      throw new BadRequestException("order not found");
    }
    if (roleCode === "staff" && order.ownerUuid !== actorUuid) {
      throw new BadRequestException("not allowed");
    }
    const isLarge = (() => {
      const n = Number(order.amount.toString());
      return !Number.isNaN(n) && n > 100000;
    })();
    if (isLarge) {
      const latest = await this.prisma.orderApproval.findFirst({
        where: { orderUuid: input.orderUuid },
        orderBy: { requestedAt: "desc" }
      });
      if (!latest || latest.status !== "已通过") {
        throw new BadRequestException("order approval required");
      }
    }
    const created = await this.prisma.refundApproval.create({
      data: {
        order: { connect: { orderUuid: input.orderUuid } },
        requester: { connect: { employeeUuid: actorUuid } },
        requestedAt: new Date(),
        status: "待审批",
        comment: input.comment
      },
      include: { order: true, requester: true, reviewer: true }
    });
    await this.logAction(actorUuid, "refund.request", "refundApproval", created.refundApprovalUuid, null, created);
    return created;
  }

  async approveRefund(actorUuid: string, input: ReviewRefundInput) {
    const before = await this.prisma.refundApproval.findUnique({
      where: { refundApprovalUuid: input.refundApprovalUuid }
    });
    if (!before) {
      throw new BadRequestException("approval not found");
    }
    const updated = await this.prisma.refundApproval.update({
      where: { refundApprovalUuid: input.refundApprovalUuid },
      data: {
        status: "已通过",
        reviewer: { connect: { employeeUuid: actorUuid } },
        reviewedAt: new Date(),
        comment: input.comment
      },
      include: { order: true, requester: true, reviewer: true }
    });
    await this.logAction(actorUuid, "refund.approve", "refundApproval", input.refundApprovalUuid, before, updated);
    return updated;
  }

  async rejectRefund(actorUuid: string, input: ReviewRefundInput) {
    const before = await this.prisma.refundApproval.findUnique({
      where: { refundApprovalUuid: input.refundApprovalUuid }
    });
    if (!before) {
      throw new BadRequestException("approval not found");
    }
    const updated = await this.prisma.refundApproval.update({
      where: { refundApprovalUuid: input.refundApprovalUuid },
      data: {
        status: "已拒绝",
        reviewer: { connect: { employeeUuid: actorUuid } },
        reviewedAt: new Date(),
        comment: input.comment
      },
      include: { order: true, requester: true, reviewer: true }
    });
    await this.logAction(actorUuid, "refund.reject", "refundApproval", input.refundApprovalUuid, before, updated);
    return updated;
  }

  async listExports(roleCode: string, userUuid: string) {
    const where = roleCode === "staff" ? { requesterUuid: userUuid } : undefined;
    return this.prisma.exportApproval.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      include: { requester: true, reviewer: true }
    });
  }

  async requestExport(actorUuid: string, input: RequestExportInput) {
    const resource = this.normalizeScopeResource(input.scope);
    if (!resource || !EXPORT_RESOURCES.includes(resource)) {
      throw new BadRequestException("invalid export scope");
    }
    const created = await this.prisma.exportApproval.create({
      data: {
        requester: { connect: { employeeUuid: actorUuid } },
        requestedAt: new Date(),
        scope: input.scope,
        status: "待审批",
        comment: input.comment
      },
      include: { requester: true, reviewer: true }
    });
    await this.logAction(actorUuid, "export.request", "exportApproval", created.exportApprovalUuid, null, created);
    return created;
  }

  async approveExport(actorUuid: string, input: ReviewExportInput) {
    const before = await this.prisma.exportApproval.findUnique({
      where: { exportApprovalUuid: input.exportApprovalUuid }
    });
    if (!before) {
      throw new BadRequestException("approval not found");
    }
    const updated = await this.prisma.exportApproval.update({
      where: { exportApprovalUuid: input.exportApprovalUuid },
      data: {
        status: "已通过",
        reviewer: { connect: { employeeUuid: actorUuid } },
        reviewedAt: new Date(),
        comment: input.comment
      },
      include: { requester: true, reviewer: true }
    });
    await this.logAction(actorUuid, "export.approve", "exportApproval", input.exportApprovalUuid, before, updated);
    return updated;
  }

  async rejectExport(actorUuid: string, input: ReviewExportInput) {
    const before = await this.prisma.exportApproval.findUnique({
      where: { exportApprovalUuid: input.exportApprovalUuid }
    });
    if (!before) {
      throw new BadRequestException("approval not found");
    }
    const updated = await this.prisma.exportApproval.update({
      where: { exportApprovalUuid: input.exportApprovalUuid },
      data: {
        status: "已拒绝",
        reviewer: { connect: { employeeUuid: actorUuid } },
        reviewedAt: new Date(),
        comment: input.comment
      },
      include: { requester: true, reviewer: true }
    });
    await this.logAction(actorUuid, "export.reject", "exportApproval", input.exportApprovalUuid, before, updated);
    return updated;
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

  private normalizeScopeResource(scope: string) {
    const s = (scope || "").toLowerCase();
    const head = s.split(":")[0] || "";
    return head.endsWith("s") ? head.slice(0, -1) : head;
  }
}
