import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

type RequestOrderApprovalInput = {
  orderUuid: string;
  comment?: string;
};

type ReviewOrderApprovalInput = {
  orderApprovalUuid: string;
  comment?: string;
};

@Injectable()
export class OrderApprovalsService {
  constructor(private readonly prisma: PrismaService) { }

  async list(roleCode: string, userUuid: string) {
    const where = roleCode === "staff" ? { requesterUuid: userUuid } : undefined;
    return this.prisma.orderApproval.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      include: { order: true, requester: true, reviewer: true }
    });
  }

  async request(actorUuid: string, input: RequestOrderApprovalInput) {
    const order = await this.prisma.order.findUnique({ where: { orderUuid: input.orderUuid } });
    if (!order) {
      throw new BadRequestException("order not found");
    }
    const created = await this.prisma.orderApproval.create({
      data: {
        order: { connect: { orderUuid: input.orderUuid } },
        requester: { connect: { employeeUuid: actorUuid } },
        requestedAt: new Date(),
        status: "待审批",
        comment: input.comment
      },
      include: { order: true, requester: true, reviewer: true }
    });
    await this.logAction(
      actorUuid,
      "order.approval.request",
      "orderApproval",
      created.orderApprovalUuid,
      null,
      created
    );
    return created;
  }

  async approve(actorUuid: string, input: ReviewOrderApprovalInput) {
    const before = await this.prisma.orderApproval.findUnique({
      where: { orderApprovalUuid: input.orderApprovalUuid }
    });
    if (!before) {
      throw new BadRequestException("approval not found");
    }
    const updated = await this.prisma.orderApproval.update({
      where: { orderApprovalUuid: input.orderApprovalUuid },
      data: {
        status: "已通过",
        reviewer: { connect: { employeeUuid: actorUuid } },
        reviewedAt: new Date(),
        comment: input.comment
      },
      include: { order: true, requester: true, reviewer: true }
    });
    await this.logAction(
      actorUuid,
      "order.approval.approve",
      "orderApproval",
      input.orderApprovalUuid,
      before,
      updated
    );
    return updated;
  }

  async reject(actorUuid: string, input: ReviewOrderApprovalInput) {
    const before = await this.prisma.orderApproval.findUnique({
      where: { orderApprovalUuid: input.orderApprovalUuid }
    });
    if (!before) {
      throw new BadRequestException("approval not found");
    }
    const updated = await this.prisma.orderApproval.update({
      where: { orderApprovalUuid: input.orderApprovalUuid },
      data: {
        status: "已拒绝",
        reviewer: { connect: { employeeUuid: actorUuid } },
        reviewedAt: new Date(),
        comment: input.comment
      },
      include: { order: true, requester: true, reviewer: true }
    });
    await this.logAction(
      actorUuid,
      "order.approval.reject",
      "orderApproval",
      input.orderApprovalUuid,
      before,
      updated
    );
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
}
