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
exports.OrderApprovalsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let OrderApprovalsService = class OrderApprovalsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(roleCode, userUuid) {
        const where = roleCode === "staff" ? { requesterUuid: userUuid } : undefined;
        return this.prisma.orderApproval.findMany({
            where,
            orderBy: { requestedAt: "desc" },
            include: { order: true, requester: true, reviewer: true }
        });
    }
    async request(actorUuid, input) {
        const order = await this.prisma.order.findUnique({ where: { orderUuid: input.orderUuid } });
        if (!order) {
            throw new common_1.BadRequestException("order not found");
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
        await this.logAction(actorUuid, "order.approval.request", "orderApproval", created.orderApprovalUuid, null, created);
        return created;
    }
    async approve(actorUuid, input) {
        const before = await this.prisma.orderApproval.findUnique({
            where: { orderApprovalUuid: input.orderApprovalUuid }
        });
        if (!before) {
            throw new common_1.BadRequestException("approval not found");
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
        await this.logAction(actorUuid, "order.approval.approve", "orderApproval", input.orderApprovalUuid, before, updated);
        return updated;
    }
    async reject(actorUuid, input) {
        const before = await this.prisma.orderApproval.findUnique({
            where: { orderApprovalUuid: input.orderApprovalUuid }
        });
        if (!before) {
            throw new common_1.BadRequestException("approval not found");
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
        await this.logAction(actorUuid, "order.approval.reject", "orderApproval", input.orderApprovalUuid, before, updated);
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
};
exports.OrderApprovalsService = OrderApprovalsService;
exports.OrderApprovalsService = OrderApprovalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrderApprovalsService);
