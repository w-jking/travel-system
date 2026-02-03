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
exports.AlertsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const CANCEL_THRESHOLD = 3;
const OFFLINE_THRESHOLD = 1;
const NIGHT_THRESHOLD = 5;
const DEFAULT_DAYS = 7;
let AlertsService = class AlertsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(roleCode, userUuid, input) {
        const where = {};
        if (roleCode === "staff") {
            where.actorUuid = userUuid;
        }
        else if (input.actorUuid) {
            where.actorUuid = input.actorUuid;
        }
        if (input.ruleCode) {
            where.ruleCode = input.ruleCode;
        }
        if (input.status) {
            where.status = input.status;
        }
        if (input.from || input.to) {
            where.createdAt = {
                gte: input.from ? new Date(input.from) : undefined,
                lte: input.to ? new Date(input.to) : undefined
            };
        }
        return this.prisma.alert.findMany({
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
    async scan(actorUuid, input) {
        const days = input.days ?? DEFAULT_DAYS;
        const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const end = new Date();
        const created = [];
        const cancelGroups = await this.prisma.order.groupBy({
            by: ["ownerUuid"],
            where: {
                status: "已取消",
                updatedAt: { gte: start, lte: end }
            },
            _count: { _all: true }
        });
        for (const group of cancelGroups) {
            if (group._count._all < CANCEL_THRESHOLD) {
                continue;
            }
            const alert = await this.createIfNotExists({
                ruleCode: "cancel_spike",
                summary: `近${days}天取消订单${group._count._all}笔`,
                actorUuid: group.ownerUuid,
                meta: { count: group._count._all, days }
            }, start);
            if (alert) {
                created.push(alert);
            }
        }
        const offlineGroups = await this.prisma.order.groupBy({
            by: ["ownerUuid"],
            where: {
                payee: { contains: "线下" },
                createdAt: { gte: start, lte: end }
            },
            _count: { _all: true }
        });
        for (const group of offlineGroups) {
            if (group._count._all < OFFLINE_THRESHOLD) {
                continue;
            }
            const alert = await this.createIfNotExists({
                ruleCode: "offline_payee",
                summary: `近${days}天线下收款订单${group._count._all}笔`,
                actorUuid: group.ownerUuid,
                meta: { count: group._count._all, days }
            }, start);
            if (alert) {
                created.push(alert);
            }
        }
        const logs = await this.prisma.auditLog.findMany({
            where: {
                createdAt: { gte: start, lte: end },
                OR: [
                    { action: { startsWith: "order." } },
                    { action: { startsWith: "customer." } }
                ]
            }
        });
        const nightCounts = new Map();
        for (const log of logs) {
            const hour = new Date(log.createdAt).getHours();
            if (hour >= 22 || hour < 6) {
                nightCounts.set(log.actorUuid, (nightCounts.get(log.actorUuid) ?? 0) + 1);
            }
        }
        for (const [ownerUuid, count] of nightCounts) {
            if (count < NIGHT_THRESHOLD) {
                continue;
            }
            const alert = await this.createIfNotExists({
                ruleCode: "night_ops",
                summary: `非工作时段敏感操作${count}次`,
                actorUuid: ownerUuid,
                meta: { count, days }
            }, start);
            if (alert) {
                created.push(alert);
            }
        }
        await this.logAction(actorUuid, "alert.scan", "alert", actorUuid, null, { created: created.length });
        return created;
    }
    async resolve(actorUuid, input) {
        const before = await this.prisma.alert.findUnique({ where: { alertUuid: input.alertUuid } });
        if (!before) {
            throw new common_1.BadRequestException("alert not found");
        }
        const updated = await this.prisma.alert.update({
            where: { alertUuid: input.alertUuid },
            data: { status: "已处理" },
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
        await this.logAction(actorUuid, "alert.resolve", "alert", input.alertUuid, before, updated);
        return updated;
    }
    async createIfNotExists(input, windowStart) {
        const existing = await this.prisma.alert.findFirst({
            where: {
                ruleCode: input.ruleCode,
                actorUuid: input.actorUuid ?? undefined,
                status: "待处理",
                createdAt: { gte: windowStart }
            }
        });
        if (existing) {
            return null;
        }
        const created = await this.prisma.alert.create({
            data: {
                ruleCode: input.ruleCode,
                summary: input.summary,
                status: "待处理",
                actor: input.actorUuid ? { connect: { employeeUuid: input.actorUuid } } : undefined,
                meta: input.meta ? JSON.parse(JSON.stringify(input.meta)) : undefined
            },
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
        return created;
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
exports.AlertsService = AlertsService;
exports.AlertsService = AlertsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AlertsService);
