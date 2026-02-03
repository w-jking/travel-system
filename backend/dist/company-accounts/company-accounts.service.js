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
exports.CompanyAccountsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const ACCOUNT_STATUSES = ["启用", "停用"];
let CompanyAccountsService = class CompanyAccountsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(roleCode, _userUuid) {
        const where = roleCode === "staff" ? { status: "启用" } : undefined;
        return this.prisma.companyAccount.findMany({
            where,
            orderBy: { createdAt: "desc" }
        });
    }
    async create(actorUuid, input) {
        const name = input.name?.trim();
        if (!name) {
            throw new common_1.BadRequestException("name required");
        }
        const status = normalizeStatus(input.status);
        const created = await this.prisma.companyAccount.create({
            data: {
                name,
                bankName: input.bankName?.trim() || undefined,
                accountNo: input.accountNo?.trim() || undefined,
                status,
                notes: input.notes?.trim() || undefined
            }
        });
        await this.logAction(actorUuid, "companyAccount.create", "companyAccount", created.accountUuid, null, created);
        return created;
    }
    async updateStatus(actorUuid, accountUuid, status) {
        const nextStatus = normalizeStatus(status);
        const before = await this.prisma.companyAccount.findUnique({
            where: { accountUuid }
        });
        if (!before) {
            throw new common_1.BadRequestException("company account not found");
        }
        const updated = await this.prisma.companyAccount.update({
            where: { accountUuid },
            data: { status: nextStatus }
        });
        await this.logAction(actorUuid, "companyAccount.status", "companyAccount", accountUuid, before, updated);
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
exports.CompanyAccountsService = CompanyAccountsService;
exports.CompanyAccountsService = CompanyAccountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompanyAccountsService);
function normalizeStatus(status) {
    if (!status) {
        return "启用";
    }
    const normalized = status.trim();
    if (!ACCOUNT_STATUSES.includes(normalized)) {
        throw new common_1.BadRequestException("invalid status");
    }
    return normalized;
}
