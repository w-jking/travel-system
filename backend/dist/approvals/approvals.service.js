"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const EXPORT_RESOURCES = ["employee", "customer"];
let ApprovalsService = class ApprovalsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listRefunds(roleCode, userUuid) {
        const where = roleCode === "staff" ? { requesterUuid: userUuid } : undefined;
        return this.prisma.refundApproval.findMany({
            where,
            orderBy: { requestedAt: "desc" },
            include: { order: true, requester: true, reviewer: true }
        });
    }
    async requestRefund(roleCode, actorUuid, input) {
        const order = await this.prisma.order.findUnique({ where: { orderUuid: input.orderUuid } });
        if (!order) {
            throw new common_1.BadRequestException("order not found");
        }
        if (roleCode === "staff" && order.ownerUuid !== actorUuid) {
            throw new common_1.BadRequestException("not allowed");
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
                throw new common_1.BadRequestException("order approval required");
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
    async approveRefund(actorUuid, input) {
        const before = await this.prisma.refundApproval.findUnique({
            where: { refundApprovalUuid: input.refundApprovalUuid }
        });
        if (!before) {
            throw new common_1.BadRequestException("approval not found");
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
    async rejectRefund(actorUuid, input) {
        const before = await this.prisma.refundApproval.findUnique({
            where: { refundApprovalUuid: input.refundApprovalUuid }
        });
        if (!before) {
            throw new common_1.BadRequestException("approval not found");
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
    async listExports(roleCode, userUuid) {
        const where = roleCode === "staff" ? { requesterUuid: userUuid } : undefined;
        return this.prisma.exportApproval.findMany({
            where,
            orderBy: { requestedAt: "desc" },
            include: { requester: true, reviewer: true }
        });
    }
    async requestExport(actorUuid, input) {
        const resource = this.normalizeScopeResource(input.scope);
        if (!resource || !EXPORT_RESOURCES.includes(resource)) {
            throw new common_1.BadRequestException("invalid export scope");
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
    async approveExport(actorUuid, input) {
        const before = await this.prisma.exportApproval.findUnique({
            where: { exportApprovalUuid: input.exportApprovalUuid }
        });
        if (!before) {
            throw new common_1.BadRequestException("approval not found");
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
    async rejectExport(actorUuid, input) {
        const before = await this.prisma.exportApproval.findUnique({
            where: { exportApprovalUuid: input.exportApprovalUuid }
        });
        if (!before) {
            throw new common_1.BadRequestException("approval not found");
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
    async logAction(actorUuid, action, targetType, targetUuid, beforeData, afterData) {
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
    normalizeScopeResource(scope) {
        const s = (scope || "").toLowerCase();
        const head = s.split(":")[0] || "";
        return head.endsWith("s") ? head.slice(0, -1) : head;
    }
};
exports.ApprovalsService = ApprovalsService;
exports.ApprovalsService = ApprovalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ApprovalsService);
