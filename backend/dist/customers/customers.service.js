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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let CustomersService = class CustomersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(roleCode, userUuid) {
        let where = undefined;
        if (roleCode === "staff") {
            where = { ownerUuid: userUuid };
        }
        else if (roleCode === "manager") {
            where = { owner: { department: await this.getActorDepartment(userUuid) } };
        }
        const customers = await this.prisma.customer.findMany({
            where,
            include: { owner: true }
        });
        if (roleCode === "admin") {
            return customers;
        }
        return customers.map((customer) => maskCustomer(customer));
    }
    async create(roleCode, userUuid, input) {
        this.validateCreateInput(input);
        const ownerUuid = await this.resolveOwnerUuid(roleCode, userUuid, input.ownerUuid);
        await this.ensureActorExists(userUuid);
        try {
            const data = this.normalizeCreateInput(input, ownerUuid);
            const created = await this.prisma.customer.create({ data, include: { owner: true } });
            await this.logAction(userUuid, "customer.create", "customer", created.customerUuid, null, created);
            return roleCode === "admin" ? created : maskCustomer(created);
        }
        catch (error) {
            throw new common_1.BadRequestException(`customer create failed: ${this.formatError(error)}`);
        }
    }
    async update(roleCode, userUuid, id, input) {
        if (roleCode === "staff") {
            const exists = await this.prisma.customer.findFirst({
                where: { customerUuid: id, ownerUuid: userUuid }
            });
            if (!exists) {
                throw new common_1.ForbiddenException("not allowed");
            }
        }
        if (roleCode !== "staff" && input.ownerUuid) {
            await this.ensureOwnerExists(input.ownerUuid);
        }
        await this.ensureActorExists(userUuid);
        const before = await this.prisma.customer.findUnique({ where: { customerUuid: id } });
        const data = this.normalizeUpdateInput(roleCode, userUuid, input);
        const updated = await this.prisma.customer.update({
            where: { customerUuid: id },
            data,
            include: { owner: true }
        });
        await this.logAction(userUuid, "customer.update", "customer", id, before, updated);
        return roleCode === "admin" ? updated : maskCustomer(updated);
    }
    async regrade(roleCode, userUuid, input) {
        const months = input.months ?? 12;
        const amountThreshold = typeof input.amountThreshold === "number"
            ? input.amountThreshold
            : input.amountThreshold
                ? Number(input.amountThreshold.toString())
                : 50000;
        const tripsThreshold = input.tripsThreshold ?? 3;
        const start = new Date();
        start.setMonth(start.getMonth() - months);
        const customerWhere = {};
        if (roleCode === "staff") {
            customerWhere.ownerUuid = userUuid;
        }
        if (input.customerUuid) {
            customerWhere.customerUuid = input.customerUuid;
        }
        const customers = await this.prisma.customer.findMany({
            where: customerWhere
        });
        const changed = [];
        for (const c of customers) {
            const sum = await this.prisma.order.aggregate({
                where: {
                    customerUuid: c.customerUuid,
                    orderedAt: { gte: start },
                    status: { not: "已取消" }
                },
                _sum: { amount: true }
            });
            const amountSum = Number(sum._sum.amount?.toString() ?? "0");
            const tripsCount = await this.prisma.order.count({
                where: {
                    customerUuid: c.customerUuid,
                    departureAt: { gte: start },
                    status: { in: ["已出团", "已完成"] }
                }
            });
            const desired = amountSum >= amountThreshold || tripsCount >= tripsThreshold ? "VIP" : "普通";
            if (desired !== c.level) {
                const before = c;
                const updated = await this.prisma.customer.update({
                    where: { customerUuid: c.customerUuid },
                    data: { level: desired }
                });
                await this.logAction(userUuid, "customer.regrade", "customer", c.customerUuid, before, updated);
                changed.push({
                    customerUuid: c.customerUuid,
                    beforeLevel: c.level,
                    afterLevel: desired,
                    amountSum,
                    tripsCount
                });
            }
        }
        return changed;
    }
    async import(roleCode, userUuid, input) {
        const rows = input.rows ?? [];
        const created = [];
        await this.ensureActorExists(userUuid);
        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index];
            this.validateCreateInput(row);
            const ownerUuid = await this.resolveOwnerUuid(roleCode, userUuid, row.ownerUuid);
            try {
                const data = this.normalizeCreateInput(row, ownerUuid);
                const record = await this.prisma.customer.create({ data, include: { owner: true } });
                await this.logAction(userUuid, "customer.import", "customer", record.customerUuid, null, record);
                created.push(roleCode === "admin" ? record : maskCustomer(record));
            }
            catch (error) {
                throw new common_1.BadRequestException(`customer import failed at row ${index + 1}: ${this.formatError(error)}`);
            }
        }
        return created;
    }
    async export(roleCode, userUuid, input) {
        await this.ensureExportApproved(roleCode, userUuid, input.exportApprovalUuid, "customer");
        let where = undefined;
        if (roleCode === "staff") {
            where = { ownerUuid: userUuid };
        }
        else if (roleCode === "manager") {
            where = { owner: { department: await this.getActorDepartment(userUuid) } };
        }
        const customers = await this.prisma.customer.findMany({
            where,
            include: { owner: true }
        });
        await this.logAction(userUuid, "customer.export", "customer", input.exportApprovalUuid, null, {
            count: customers.length
        });
        return customers;
    }
    async reportValue(roleCode, userUuid, input) {
        const range = this.parseDateRange(input);
        const customerWhere = {};
        if (roleCode === "staff") {
            customerWhere.ownerUuid = userUuid;
        }
        else {
            if (roleCode === "manager") {
                const managed = await this.getManagedOwnerUuids(userUuid);
                if (input.ownerUuids && input.ownerUuids.length > 0) {
                    const filter = new Set(input.ownerUuids);
                    customerWhere.ownerUuid = { in: managed.filter((id) => filter.has(id)) };
                }
                else {
                    customerWhere.ownerUuid = { in: managed };
                }
            }
            else if (input.ownerUuids && input.ownerUuids.length > 0) {
                customerWhere.ownerUuid = { in: input.ownerUuids };
            }
            else if (input.ownerUuid) {
                customerWhere.ownerUuid = input.ownerUuid;
            }
        }
        if (input.customerUuids && input.customerUuids.length > 0) {
            customerWhere.customerUuid = { in: input.customerUuids };
        }
        else if (input.customerUuid) {
            customerWhere.customerUuid = input.customerUuid;
        }
        const customers = await this.prisma.customer.findMany({
            where: customerWhere,
            select: {
                customerUuid: true,
                name: true,
                level: true,
                ownerUuid: true
            }
        });
        const customerUuids = customers.map((c) => c.customerUuid);
        if (customerUuids.length === 0) {
            return [];
        }
        const amountWhere = { customerUuid: { in: customerUuids } };
        if (range) {
            amountWhere.orderedAt = range;
        }
        const tripsWhere = { customerUuid: { in: customerUuids } };
        if (range) {
            tripsWhere.departureAt = range;
        }
        const amountAgg = await this.prisma.order.groupBy({
            by: ["customerUuid"],
            where: { ...amountWhere, status: { notIn: ["已取消"] } },
            _sum: { amount: true },
            _count: { _all: true }
        });
        const tripsAgg = await this.prisma.order.groupBy({
            by: ["customerUuid"],
            where: { ...tripsWhere, status: { in: ["已出团", "已完成"] } },
            _count: { _all: true }
        });
        const lastOrder = await this.prisma.order.findMany({
            where: { ...amountWhere, status: { notIn: ["已取消"] } },
            orderBy: { orderedAt: "desc" },
            select: { customerUuid: true, orderedAt: true }
        });
        const regradeLogs = await this.prisma.auditLog.findMany({
            where: {
                action: "customer.regrade",
                ...(range ? { createdAt: range } : {}),
                targetUuid: { in: customerUuids }
            },
            orderBy: { createdAt: "desc" },
            select: { targetUuid: true, createdAt: true }
        });
        const amountMap = new Map();
        for (const a of amountAgg) {
            amountMap.set(a.customerUuid, {
                sum: Number(a._sum.amount?.toString() ?? "0"),
                count: a._count._all
            });
        }
        const tripsMap = new Map();
        for (const t of tripsAgg) {
            tripsMap.set(t.customerUuid, t._count._all);
        }
        const lastOrderMap = new Map();
        for (const o of lastOrder) {
            if (!lastOrderMap.has(o.customerUuid)) {
                lastOrderMap.set(o.customerUuid, o.orderedAt);
            }
        }
        const regradeCountMap = new Map();
        const lastRegradeMap = new Map();
        for (const log of regradeLogs) {
            regradeCountMap.set(log.targetUuid, (regradeCountMap.get(log.targetUuid) ?? 0) + 1);
            if (!lastRegradeMap.has(log.targetUuid)) {
                lastRegradeMap.set(log.targetUuid, log.createdAt);
            }
        }
        const items = customers.map((c) => ({
            customerUuid: c.customerUuid,
            name: c.name,
            level: c.level,
            ownerUuid: c.ownerUuid,
            amountSum: amountMap.get(c.customerUuid)?.sum ?? 0,
            ordersCount: amountMap.get(c.customerUuid)?.count ?? 0,
            tripsCount: tripsMap.get(c.customerUuid) ?? 0,
            lastOrderedAt: lastOrderMap.get(c.customerUuid) ?? null,
            regradeCount: regradeCountMap.get(c.customerUuid) ?? 0,
            lastRegradeAt: lastRegradeMap.get(c.customerUuid) ?? null
        }));
        const sorted = this.sortCustomerReport(items, input);
        return this.paginate(sorted, input);
    }
    sortCustomerReport(items, input) {
        const sortBy = input.sortBy ?? "amountSum";
        const order = input.sortOrder === "asc" ? 1 : -1;
        const valueOf = (item) => {
            switch (sortBy) {
                case "ordersCount":
                    return item.ordersCount;
                case "tripsCount":
                    return item.tripsCount;
                case "regradeCount":
                    return item.regradeCount;
                case "lastOrderedAt":
                    return item.lastOrderedAt?.getTime() ?? 0;
                case "lastRegradeAt":
                    return item.lastRegradeAt?.getTime() ?? 0;
                case "name":
                    return item.name;
                case "level":
                    return item.level;
                case "amountSum":
                default:
                    return item.amountSum;
            }
        };
        return [...items].sort((a, b) => {
            const va = valueOf(a);
            const vb = valueOf(b);
            if (typeof va === "string" && typeof vb === "string") {
                return va.localeCompare(vb) * order;
            }
            return (Number(va) - Number(vb)) * order;
        });
    }
    paginate(items, input) {
        const total = items.length;
        const pageSize = Math.max(1, Math.min(200, Math.floor(input.pageSize ?? 20)));
        const page = Math.max(1, Math.floor(input.page ?? 1));
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return {
            total,
            page,
            pageSize,
            items: items.slice(start, end)
        };
    }
    validateCreateInput(input) {
        const missing = [];
        if (!input.name)
            missing.push("name");
        if (!input.contact)
            missing.push("contact");
        if (!input.level)
            missing.push("level");
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`missing fields: ${missing.join(", ")}`);
        }
        if (input.birthDate) {
            this.parseDate(input.birthDate, "birthDate");
        }
    }
    parseDate(value, field) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            throw new common_1.BadRequestException(`${field} invalid`);
        }
        return date;
    }
    parseDateRange(input) {
        if (!input.from && !input.to) {
            return undefined;
        }
        return {
            gte: input.from ? this.parseDate(input.from, "from") : undefined,
            lte: input.to ? this.parseDate(input.to, "to") : undefined
        };
    }
    formatError(error) {
        if (error instanceof Error) {
            return error.message;
        }
        return "unknown error";
    }
    async resolveOwnerUuid(roleCode, userUuid, inputOwnerUuid) {
        const ownerUuid = roleCode === "staff" ? userUuid : (inputOwnerUuid ?? userUuid);
        if (!ownerUuid) {
            throw new common_1.BadRequestException("owner required");
        }
        await this.ensureOwnerExists(ownerUuid);
        return ownerUuid;
    }
    async ensureOwnerExists(ownerUuid) {
        const owner = await this.prisma.employee.findUnique({ where: { employeeUuid: ownerUuid } });
        if (!owner) {
            throw new common_1.BadRequestException("owner not found");
        }
    }
    async ensureActorExists(actorUuid) {
        const actor = await this.prisma.employee.findUnique({ where: { employeeUuid: actorUuid } });
        if (!actor) {
            throw new common_1.BadRequestException("actor not found");
        }
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
    async getManagedOwnerUuids(actorUuid) {
        const dept = await this.getActorDepartment(actorUuid);
        const employees = await this.prisma.employee.findMany({
            where: { department: dept },
            select: { employeeUuid: true }
        });
        return employees.map((e) => e.employeeUuid);
    }
    isExportScopeMatch(scope, expectedScope) {
        const raw = (scope || "").toLowerCase();
        const normalized = raw.split(":")[0] || "";
        const singular = normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
        return singular === expectedScope.toLowerCase();
    }
    normalizeCreateInput(input, ownerUuid) {
        return {
            name: input.name,
            contact: input.contact,
            level: input.level,
            ownerUuid,
            idNumber: input.idNumber,
            birthDate: input.birthDate ? this.parseDate(input.birthDate, "birthDate") : undefined,
            preferences: input.preferences,
            notes: input.notes
        };
    }
    normalizeUpdateInput(roleCode, userUuid, input) {
        const data = {
            name: input.name,
            contact: input.contact,
            level: input.level,
            ownerUuid: roleCode === "staff" ? userUuid : input.ownerUuid,
            idNumber: input.idNumber,
            birthDate: input.birthDate ? this.parseDate(input.birthDate, "birthDate") : undefined,
            preferences: input.preferences,
            notes: input.notes
        };
        Object.keys(data).forEach((key) => {
            if (data[key] === undefined) {
                delete data[key];
            }
        });
        return data;
    }
    async ensureExportApproved(roleCode, userUuid, exportApprovalUuid, expectedScope) {
        if (!exportApprovalUuid) {
            throw new common_1.ForbiddenException("export approval required");
        }
        const approval = await this.prisma.exportApproval.findUnique({
            where: { exportApprovalUuid }
        });
        if (!approval) {
            throw new common_1.ForbiddenException("approval not found");
        }
        if (expectedScope && !this.isExportScopeMatch(approval.scope, expectedScope)) {
            throw new common_1.ForbiddenException("export scope mismatch");
        }
        if (approval.status !== "已通过") {
            throw new common_1.ForbiddenException("approval not approved");
        }
        if (roleCode === "staff" && approval.requesterUuid !== userUuid) {
            throw new common_1.ForbiddenException("not allowed");
        }
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
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
function maskCustomer(customer) {
    return {
        ...customer,
        contact: maskContact(customer.contact),
        idNumber: customer.idNumber ? maskIdNumber(customer.idNumber) : customer.idNumber
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
