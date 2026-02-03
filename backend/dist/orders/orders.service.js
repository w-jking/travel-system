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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma.service");
const alerts_service_1 = require("../alerts/alerts.service");
const ORDER_STATUSES = ["待确认", "已收款", "已出团", "已完成", "已取消"];
const LARGE_ORDER_THRESHOLD = 100000;
let OrdersService = class OrdersService {
    constructor(prisma, alertsService) {
        this.prisma = prisma;
        this.alertsService = alertsService;
    }
    async findAll(roleCode, userUuid) {
        let where = undefined;
        if (roleCode === "staff") {
            where = { ownerUuid: userUuid };
        }
        else if (roleCode === "manager") {
            where = { owner: { department: await this.getActorDepartment(userUuid) } };
        }
        const orders = await this.prisma.order.findMany({
            where,
            include: { customer: true, owner: true, companyAccount: true }
        });
        if (roleCode === "admin") {
            return orders;
        }
        return orders.map((order) => maskOrder(order));
    }
    async create(roleCode, userUuid, input) {
        if (!input.orderedAt) {
            throw new common_1.BadRequestException("orderedAt required");
        }
        if (!isValidStatus(input.status)) {
            throw new common_1.BadRequestException("invalid status");
        }
        const data = this.normalizeCreateInput(roleCode, userUuid, input);
        const created = await this.prisma.order.create({
            data,
            include: { customer: true, owner: true, companyAccount: true }
        });
        if (isOfflinePayee(created.payee)) {
            await this.alertsService.scan(userUuid, { days: 7 });
        }
        if (isLargeAmount(input.amount)) {
            await this.ensureOrderApproval(created.orderUuid, userUuid);
        }
        await this.logAction(userUuid, "order.create", "order", created.orderUuid, null, created);
        return roleCode === "admin" ? created : maskOrder(created);
    }
    async update(roleCode, userUuid, id, input) {
        if (roleCode === "staff") {
            const exists = await this.prisma.order.findFirst({
                where: { orderUuid: id, ownerUuid: userUuid }
            });
            if (!exists) {
                throw new common_1.ForbiddenException("not allowed");
            }
        }
        const before = await this.prisma.order.findUnique({ where: { orderUuid: id } });
        const data = this.normalizeUpdateInput(roleCode, userUuid, input);
        const updated = await this.prisma.order.update({
            where: { orderUuid: id },
            data,
            include: { customer: true, owner: true, companyAccount: true }
        });
        if (isOfflinePayee(updated.payee)) {
            await this.alertsService.scan(userUuid, { days: 7 });
        }
        if (input.amount !== undefined && isLargeAmount(input.amount)) {
            await this.ensureOrderApproval(id, userUuid);
        }
        await this.logAction(userUuid, "order.update", "order", id, before, updated);
        return roleCode === "admin" ? updated : maskOrder(updated);
    }
    async updateStatus(roleCode, userUuid, id, status, reason) {
        if (!reason) {
            throw new common_1.BadRequestException("reason required");
        }
        if (!isValidStatus(status)) {
            throw new common_1.BadRequestException("invalid status");
        }
        const order = await this.prisma.order.findUnique({ where: { orderUuid: id } });
        if (!order) {
            throw new common_1.BadRequestException("order not found");
        }
        if (isLargeAmount(order.amount)) {
            const pendingApproval = await this.prisma.orderApproval.findFirst({
                where: { orderUuid: id, status: "待审批" }
            });
            if (pendingApproval && roleCode === "staff") {
                throw new common_1.ForbiddenException("approval required");
            }
        }
        if (roleCode === "staff") {
            const exists = await this.prisma.order.findFirst({
                where: { orderUuid: id, ownerUuid: userUuid }
            });
            if (!exists) {
                throw new common_1.ForbiddenException("not allowed");
            }
        }
        const before = await this.prisma.order.findUnique({ where: { orderUuid: id } });
        const updated = await this.prisma.order.update({
            where: { orderUuid: id },
            data: { status },
            include: { customer: true, owner: true, companyAccount: true }
        });
        await this.logAction(userUuid, "order.status", "order", id, before, { ...updated, reason });
        return roleCode === "admin" ? updated : maskOrder(updated);
    }
    normalizeCreateInput(roleCode, userUuid, input) {
        const ownerUuid = roleCode === "staff" ? userUuid : (input.ownerUuid ?? userUuid);
        return {
            customer: { connect: { customerUuid: input.customerUuid } },
            amount: new client_1.Prisma.Decimal(input.amount),
            payee: input.companyAccountUuid ? (input.payee ?? "") : offlineMark(input.payee),
            status: input.status,
            owner: { connect: { employeeUuid: ownerUuid } },
            companyAccount: input.companyAccountUuid ? { connect: { accountUuid: input.companyAccountUuid } } : undefined,
            orderedAt: new Date(input.orderedAt),
            departureAt: input.departureAt ? new Date(input.departureAt) : undefined,
            route: input.route,
            attachment: input.attachment,
            notes: input.notes
        };
    }
    normalizeUpdateInput(roleCode, userUuid, input) {
        const data = {
            customer: input.customerUuid ? { connect: { customerUuid: input.customerUuid } } : undefined,
            amount: input.amount !== undefined ? new client_1.Prisma.Decimal(input.amount) : undefined,
            payee: input.companyAccountUuid ? input.payee : (input.payee !== undefined ? offlineMark(input.payee) : undefined),
            companyAccount: input.companyAccountUuid ? { connect: { accountUuid: input.companyAccountUuid } } : undefined,
            owner: input.ownerUuid
                ? { connect: { employeeUuid: roleCode === "staff" ? userUuid : input.ownerUuid } }
                : roleCode === "staff"
                    ? { connect: { employeeUuid: userUuid } }
                    : undefined,
            orderedAt: input.orderedAt ? new Date(input.orderedAt) : undefined,
            departureAt: input.departureAt ? new Date(input.departureAt) : undefined,
            route: input.route,
            attachment: input.attachment,
            notes: input.notes
        };
        Object.keys(data).forEach((key) => {
            if (data[key] === undefined) {
                delete data[key];
            }
        });
        return data;
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
    async ensureOrderApproval(orderUuid, requesterUuid) {
        const existing = await this.prisma.orderApproval.findFirst({
            where: { orderUuid, status: "待审批" }
        });
        if (existing) {
            return;
        }
        await this.prisma.orderApproval.create({
            data: {
                order: { connect: { orderUuid } },
                requester: { connect: { employeeUuid: requesterUuid } },
                requestedAt: new Date(),
                status: "待审批"
            }
        });
    }
    async getActorDepartment(actorUuid) {
        const actor = await this.prisma.employee.findUnique({
            where: { employeeUuid: actorUuid },
            select: { department: true }
        });
        if (!actor?.department) {
            throw new common_1.BadRequestException("actor not found");
        }
        return actor.department;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        alerts_service_1.AlertsService])
], OrdersService);
function isValidStatus(status) {
    return ORDER_STATUSES.includes(status);
}
function isLargeAmount(value) {
    const amount = typeof value === "number" ? value : Number(value.toString());
    if (Number.isNaN(amount)) {
        return false;
    }
    return amount > LARGE_ORDER_THRESHOLD;
}
function offlineMark(value) {
    const text = (value ?? "").trim();
    return text ? `线下 - ${text}` : "线下";
}
function isOfflinePayee(value) {
    return (value ?? "").includes("线下");
}
function maskOrder(order) {
    return {
        ...order,
        customer: order.customer ? maskCustomer(order.customer) : order.customer,
        owner: order.owner ? maskEmployee(order.owner) : order.owner
    };
}
function maskCustomer(customer) {
    return {
        ...customer,
        contact: maskContact(customer.contact),
        idNumber: customer.idNumber ? maskIdNumber(customer.idNumber) : customer.idNumber
    };
}
function maskEmployee(employee) {
    return {
        ...employee,
        phone: maskPhone(employee.phone),
        email: employee.email ? maskEmail(employee.email) : employee.email
    };
}
function maskContact(value) {
    if (!value) {
        return value;
    }
    if (value.includes("@")) {
        return maskEmail(value);
    }
    return maskPhone(value);
}
function maskPhone(value) {
    if (!value || value.length < 7) {
        return value;
    }
    return `${value.slice(0, 3)}****${value.slice(-4)}`;
}
function maskIdNumber(value) {
    if (!value || value.length <= 6) {
        return value;
    }
    const start = value.slice(0, 4);
    const end = value.slice(-2);
    return `${start}****${end}`;
}
function maskEmail(value) {
    const [local, domain] = value.split("@");
    if (!domain) {
        return value;
    }
    if (local.length <= 4) {
        return `****@${domain}`;
    }
    const start = local.slice(0, 2);
    const end = local.slice(-2);
    return `${start}****${end}@${domain}`;
}
