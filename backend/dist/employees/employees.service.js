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
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let EmployeesService = class EmployeesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(roleCode, userUuid) {
        const where = roleCode === "manager"
            ? { department: await this.getActorDepartment(userUuid) }
            : undefined;
        const employees = await this.prisma.employee.findMany({ where, include: { role: true } });
        if (roleCode === "admin") {
            return employees;
        }
        return employees.map((employee) => maskEmployee(employee));
    }
    async create(actorUuid, input) {
        this.validateCreateInput(input);
        const roleUuid = await this.resolveRoleUuid(input.roleCode);
        await this.ensureActorExists(actorUuid);
        try {
            const data = this.normalizeCreateInput(input, roleUuid);
            const created = await this.prisma.employee.create({ data, include: { role: true } });
            await this.logAction(actorUuid, "employee.create", "employee", created.employeeUuid, null, created);
            return created;
        }
        catch (error) {
            throw new common_1.BadRequestException(`employee create failed: ${this.formatError(error)}`);
        }
    }
    async update(actorUuid, id, input) {
        const roleUuid = input.roleCode ? await this.resolveRoleUuid(input.roleCode) : undefined;
        await this.ensureActorExists(actorUuid);
        const before = await this.prisma.employee.findUnique({ where: { employeeUuid: id } });
        const data = this.normalizeInput(input, roleUuid);
        const updated = await this.prisma.employee.update({
            where: { employeeUuid: id },
            data,
            include: { role: true }
        });
        await this.logAction(actorUuid, "employee.update", "employee", id, before, updated);
        return updated;
    }
    async updateStatus(actorUuid, id, status) {
        await this.ensureActorExists(actorUuid);
        const before = await this.prisma.employee.findUnique({ where: { employeeUuid: id } });
        const updated = await this.prisma.employee.update({
            where: { employeeUuid: id },
            data: { status }
        });
        await this.logAction(actorUuid, "employee.status", "employee", id, before, updated);
        return updated;
    }
    async import(actorUuid, input) {
        const rows = input.rows ?? [];
        const created = [];
        await this.ensureActorExists(actorUuid);
        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index];
            this.validateCreateInput(row);
            const roleUuid = await this.resolveRoleUuid(row.roleCode);
            try {
                const data = this.normalizeCreateInput(row, roleUuid);
                const record = await this.prisma.employee.create({ data, include: { role: true } });
                await this.logAction(actorUuid, "employee.import", "employee", record.employeeUuid, null, record);
                created.push(record);
            }
            catch (error) {
                throw new common_1.BadRequestException(`employee import failed at row ${index + 1}: ${this.formatError(error)}`);
            }
        }
        return created;
    }
    async export(roleCode, userUuid, input) {
        await this.ensureExportApproved(roleCode, userUuid, input.exportApprovalUuid, "employee");
        const where = roleCode === "manager"
            ? { department: await this.getActorDepartment(userUuid) }
            : undefined;
        const employees = await this.prisma.employee.findMany({ where, include: { role: true } });
        await this.logAction(userUuid, "employee.export", "employee", input.exportApprovalUuid, null, {
            count: employees.length
        });
        return employees;
    }
    async reportPerformance(roleCode, userUuid, input) {
        const range = this.parseDateRange(input);
        const employeeWhere = {};
        if (roleCode === "staff") {
            employeeWhere.employeeUuid = userUuid;
        }
        else if (roleCode === "manager") {
            employeeWhere.department = await this.getActorDepartment(userUuid);
            if (input.employeeUuids && input.employeeUuids.length > 0) {
                employeeWhere.employeeUuid = { in: input.employeeUuids };
            }
            else if (input.employeeUuid) {
                employeeWhere.employeeUuid = input.employeeUuid;
            }
        }
        else if (input.employeeUuids && input.employeeUuids.length > 0) {
            employeeWhere.employeeUuid = { in: input.employeeUuids };
        }
        else if (input.employeeUuid) {
            employeeWhere.employeeUuid = input.employeeUuid;
        }
        const employees = await this.prisma.employee.findMany({
            where: employeeWhere,
            select: {
                employeeUuid: true,
                name: true,
                department: true,
                position: true
            }
        });
        const employeeUuids = employees.map((employee) => employee.employeeUuid);
        if (employeeUuids.length === 0) {
            return [];
        }
        const customerWhere = { ownerUuid: { in: employeeUuids } };
        if (range) {
            customerWhere.createdAt = range;
        }
        const customerGroups = await this.prisma.customer.groupBy({
            by: ["ownerUuid"],
            where: customerWhere,
            _count: { _all: true }
        });
        const orderWhere = { ownerUuid: { in: employeeUuids }, status: { not: "已取消" } };
        if (range) {
            orderWhere.orderedAt = range;
        }
        const orderGroups = await this.prisma.order.groupBy({
            by: ["ownerUuid"],
            where: orderWhere,
            _count: { _all: true },
            _sum: { amount: true }
        });
        const followWhere = { ownerUuid: { in: employeeUuids } };
        if (range) {
            followWhere.followAt = range;
        }
        const followGroups = await this.prisma.followUp.groupBy({
            by: ["ownerUuid"],
            where: followWhere,
            _count: { _all: true }
        });
        const customerCountByOwner = new Map();
        for (const item of customerGroups) {
            customerCountByOwner.set(item.ownerUuid, item._count._all);
        }
        const orderCountByOwner = new Map();
        const orderAmountByOwner = new Map();
        for (const item of orderGroups) {
            orderCountByOwner.set(item.ownerUuid, item._count._all);
            orderAmountByOwner.set(item.ownerUuid, Number(item._sum.amount?.toString() ?? "0"));
        }
        const followCountByOwner = new Map();
        for (const item of followGroups) {
            followCountByOwner.set(item.ownerUuid, item._count._all);
        }
        const items = employees.map((employee) => {
            const customerCount = customerCountByOwner.get(employee.employeeUuid) ?? 0;
            const orderCount = orderCountByOwner.get(employee.employeeUuid) ?? 0;
            const orderAmount = orderAmountByOwner.get(employee.employeeUuid) ?? 0;
            const followUpCount = followCountByOwner.get(employee.employeeUuid) ?? 0;
            const conversionRate = customerCount === 0 ? 0 : orderCount / customerCount;
            return {
                ...employee,
                customerCount,
                orderCount,
                orderAmount,
                conversionRate,
                followUpCount
            };
        });
        const sorted = this.sortEmployeeReport(items, input);
        return this.paginate(sorted, input);
    }
    sortEmployeeReport(items, input) {
        const sortBy = input.sortBy ?? "orderAmount";
        const order = input.sortOrder === "asc" ? 1 : -1;
        const valueOf = (item) => {
            switch (sortBy) {
                case "customerCount":
                    return item.customerCount;
                case "orderCount":
                    return item.orderCount;
                case "followUpCount":
                    return item.followUpCount;
                case "conversionRate":
                    return item.conversionRate;
                case "name":
                    return item.name;
                case "department":
                    return item.department;
                case "position":
                    return item.position;
                case "orderAmount":
                default:
                    return item.orderAmount;
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
        if (!input.phone)
            missing.push("phone");
        if (!input.department)
            missing.push("department");
        if (!input.position)
            missing.push("position");
        if (!input.roleCode)
            missing.push("roleCode");
        if (!input.status)
            missing.push("status");
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`missing fields: ${missing.join(", ")}`);
        }
        if (input.hiredAt) {
            this.parseDate(input.hiredAt, "hiredAt");
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
    async resolveRoleUuid(roleCode) {
        if (!roleCode) {
            throw new common_1.BadRequestException("role required");
        }
        const byCode = await this.prisma.role.findUnique({ where: { code: roleCode } });
        if (byCode) {
            return byCode.roleUuid;
        }
        const byUuid = await this.prisma.role.findUnique({ where: { roleUuid: roleCode } });
        if (byUuid) {
            return byUuid.roleUuid;
        }
        const byName = await this.prisma.role.findFirst({ where: { name: roleCode } });
        if (byName) {
            return byName.roleUuid;
        }
        throw new common_1.BadRequestException("invalid role");
    }
    normalizeCreateInput(input, roleUuid) {
        return {
            name: input.name,
            phone: input.phone,
            department: input.department,
            position: input.position,
            role: { connect: { roleUuid } },
            status: input.status,
            email: input.email,
            hiredAt: input.hiredAt ? this.parseDate(input.hiredAt, "hiredAt") : undefined,
            employeeNo: input.employeeNo
        };
    }
    normalizeInput(input, roleUuid) {
        const data = {
            name: input.name,
            phone: input.phone,
            department: input.department,
            position: input.position,
            role: roleUuid ? { connect: { roleUuid } } : undefined,
            status: input.status,
            email: input.email,
            hiredAt: input.hiredAt ? this.parseDate(input.hiredAt, "hiredAt") : undefined,
            employeeNo: input.employeeNo
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
            throw new common_1.BadRequestException("export approval required");
        }
        const approval = await this.prisma.exportApproval.findUnique({
            where: { exportApprovalUuid }
        });
        if (!approval) {
            throw new common_1.BadRequestException("approval not found");
        }
        if (expectedScope && !this.isExportScopeMatch(approval.scope, expectedScope)) {
            throw new common_1.BadRequestException("export scope mismatch");
        }
        if (approval.status !== "已通过") {
            throw new common_1.BadRequestException("approval not approved");
        }
        if (roleCode === "staff" && approval.requesterUuid !== userUuid) {
            throw new common_1.BadRequestException("not allowed");
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
    isExportScopeMatch(scope, expectedScope) {
        const raw = (scope || "").toLowerCase();
        const normalized = raw.split(":")[0] || "";
        const singular = normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
        return singular === expectedScope.toLowerCase();
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmployeesService);
function maskEmployee(employee) {
    return {
        ...employee,
        phone: maskPhone(employee.phone),
        email: employee.email ? maskEmail(employee.email) : employee.email
    };
}
function maskPhone(value) {
    if (!value || value.length < 7) {
        return value;
    }
    return `${value.slice(0, 3)}****${value.slice(-4)}`;
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
