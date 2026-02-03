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
exports.FollowUpsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let FollowUpsService = class FollowUpsService {
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
        const followUps = await this.prisma.followUp.findMany({
            where,
            include: { customer: true, order: true, owner: true }
        });
        if (roleCode === "admin") {
            return followUps;
        }
        return followUps.map((followUp) => maskFollowUp(followUp));
    }
    async create(roleCode, userUuid, input) {
        const data = this.normalizeCreateInput(roleCode, userUuid, input);
        const created = await this.prisma.followUp.create({
            data,
            include: { customer: true, order: true, owner: true }
        });
        await this.logAction(userUuid, "followup.create", "followup", created.followUpUuid, null, created);
        return roleCode === "admin" ? created : maskFollowUp(created);
    }
    async update(roleCode, userUuid, id, input) {
        if (roleCode === "staff") {
            const exists = await this.prisma.followUp.findFirst({
                where: { followUpUuid: id, ownerUuid: userUuid }
            });
            if (!exists) {
                throw new common_1.ForbiddenException("not allowed");
            }
        }
        const before = await this.prisma.followUp.findUnique({ where: { followUpUuid: id } });
        const data = this.normalizeUpdateInput(input);
        const updated = await this.prisma.followUp.update({
            where: { followUpUuid: id },
            data,
            include: { customer: true, order: true, owner: true }
        });
        await this.logAction(userUuid, "followup.update", "followup", id, before, updated);
        return roleCode === "admin" ? updated : maskFollowUp(updated);
    }
    normalizeCreateInput(roleCode, userUuid, input) {
        const ownerUuid = roleCode === "staff" ? userUuid : userUuid;
        return {
            customer: { connect: { customerUuid: input.customerUuid } },
            order: input.orderUuid ? { connect: { orderUuid: input.orderUuid } } : undefined,
            followAt: new Date(input.followAt),
            channel: input.channel,
            request: input.request,
            result: input.result,
            owner: { connect: { employeeUuid: ownerUuid } },
            nextFollowAt: input.nextFollowAt ? new Date(input.nextFollowAt) : undefined,
            attachment: input.attachment
        };
    }
    normalizeUpdateInput(input) {
        const data = {
            followAt: input.followAt ? new Date(input.followAt) : undefined,
            channel: input.channel,
            request: input.request,
            result: input.result,
            nextFollowAt: input.nextFollowAt ? new Date(input.nextFollowAt) : undefined,
            attachment: input.attachment
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
    async getActorDepartment(actorUuid) {
        const actor = await this.prisma.employee.findUnique({
            where: { employeeUuid: actorUuid },
            select: { department: true }
        });
        if (!actor?.department) {
            throw new common_1.ForbiddenException("actor not found");
        }
        return actor.department;
    }
};
exports.FollowUpsService = FollowUpsService;
exports.FollowUpsService = FollowUpsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FollowUpsService);
function maskFollowUp(followUp) {
    return {
        ...followUp,
        customer: followUp.customer ? maskCustomer(followUp.customer) : followUp.customer,
        owner: followUp.owner ? maskEmployee(followUp.owner) : followUp.owner
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
