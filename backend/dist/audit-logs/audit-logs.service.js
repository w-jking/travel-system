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
exports.AuditLogsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let AuditLogsService = class AuditLogsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(roleCode, userUuid, input) {
        const where = {};
        if (roleCode === "staff") {
            where.actorUuid = userUuid;
        }
        else if (roleCode === "manager") {
            where.actor = { department: await this.getActorDepartment(userUuid) };
        }
        else if (input.actorUuid) {
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
exports.AuditLogsService = AuditLogsService;
exports.AuditLogsService = AuditLogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditLogsService);
