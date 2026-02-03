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
exports.BackupService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
const prisma_service_1 = require("../prisma.service");
const BACKUP_INTERVAL_DAYS = 7;
const RETENTION_DAYS = 15;
let BackupService = class BackupService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleInit() {
        await this.ensureDir();
        await this.runSchedule();
        this.scheduleNextRun();
    }
    onModuleDestroy() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }
    async list() {
        const items = await this.loadBackups();
        const status = await this.loadStatus();
        return {
            status,
            retentionDays: RETENTION_DAYS,
            intervalDays: BACKUP_INTERVAL_DAYS,
            items
        };
    }
    async run(actorUuid, input) {
        const result = await this.createBackup({ note: input.note });
        await this.logAction(actorUuid, "backup.run", "backup", result.backupId, null, result);
        return result;
    }
    async restore(actorUuid, input) {
        const target = await this.resolveBackup(input);
        if (input.dryRun) {
            this.validateBackup(target.payload);
            await this.updateStatus({ lastDrillAt: new Date().toISOString() });
            await this.logAction(actorUuid, "backup.drill", "backup", target.backupId, null, {
                backupId: target.backupId
            });
            return {
                backupId: target.backupId,
                dryRun: true
            };
        }
        await this.applyRestore(target.payload);
        await this.logAction(actorUuid, "backup.restore", "backup", target.backupId, null, {
            backupId: target.backupId
        });
        return {
            backupId: target.backupId,
            restoredAt: new Date().toISOString()
        };
    }
    scheduleNextRun() {
        const delay = msUntilNextMonday2am(new Date());
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => {
            this.runScheduledTask().catch(() => undefined);
        }, delay);
    }
    async runScheduledTask() {
        await this.runSchedule();
        this.scheduleNextRun();
    }
    async runSchedule() {
        const status = await this.loadStatus();
        const now = new Date();
        const lastBackupAt = status.lastBackupAt ? new Date(status.lastBackupAt) : undefined;
        if (!lastBackupAt || isOlderThan(lastBackupAt, BACKUP_INTERVAL_DAYS, now)) {
            await this.createBackup({ note: "scheduled" });
        }
        await this.cleanupRetention();
        const lastDrillAt = status.lastDrillAt ? new Date(status.lastDrillAt) : undefined;
        if (!lastDrillAt || isOlderThan(lastDrillAt, BACKUP_INTERVAL_DAYS, now)) {
            const latest = await this.getLatestBackup();
            if (latest) {
                this.validateBackup(latest.payload);
                await this.updateStatus({ lastDrillAt: new Date().toISOString() });
            }
        }
    }
    async createBackup(input) {
        await this.ensureDir();
        const createdAt = new Date();
        const backupId = formatBackupId(createdAt);
        const data = await this.collectSnapshot();
        const payload = {
            version: 1,
            backupId,
            createdAt: createdAt.toISOString(),
            note: input.note ?? null,
            data
        };
        const filePath = this.getBackupPath(backupId);
        const serialized = JSON.stringify(payload);
        await fs_1.promises.writeFile(filePath, serialized, "utf8");
        await this.updateStatus({ lastBackupAt: payload.createdAt });
        const stats = await fs_1.promises.stat(filePath);
        await this.cleanupRetention();
        return {
            backupId,
            createdAt: payload.createdAt,
            size: stats.size,
            counts: collectCounts(data)
        };
    }
    async resolveBackup(input) {
        if (input.backupId) {
            const payload = await this.readBackup(input.backupId);
            return { backupId: input.backupId, payload };
        }
        if (input.at) {
            const at = new Date(input.at);
            if (Number.isNaN(at.getTime())) {
                throw new common_1.BadRequestException("invalid at");
            }
            const backups = await this.loadBackups();
            const candidates = backups
                .filter((item) => new Date(item.createdAt).getTime() <= at.getTime())
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            if (candidates.length === 0) {
                throw new common_1.BadRequestException("backup not found");
            }
            const backupId = candidates[0].backupId;
            const payload = await this.readBackup(backupId);
            return { backupId, payload };
        }
        const latest = await this.getLatestBackup();
        if (!latest) {
            throw new common_1.BadRequestException("backup not found");
        }
        return { backupId: latest.backupId, payload: latest.payload };
    }
    async getLatestBackup() {
        const backups = await this.loadBackups();
        if (backups.length === 0) {
            return null;
        }
        const sorted = backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const backupId = sorted[0].backupId;
        const payload = await this.readBackup(backupId);
        return { backupId, payload };
    }
    async loadBackups() {
        await this.ensureDir();
        const entries = await fs_1.promises.readdir(this.getBackupDir());
        const items = [];
        for (const entry of entries) {
            if (!entry.endsWith(".json") || entry === "status.json") {
                continue;
            }
            const backupId = entry.replace(/\.json$/, "");
            const payload = await this.readBackup(backupId);
            const stats = await fs_1.promises.stat(this.getBackupPath(backupId));
            items.push({
                backupId,
                createdAt: payload.createdAt,
                note: payload.note ?? null,
                size: stats.size,
                counts: collectCounts(payload.data)
            });
        }
        return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async cleanupRetention() {
        const entries = await fs_1.promises.readdir(this.getBackupDir());
        const now = new Date();
        for (const entry of entries) {
            if (!entry.endsWith(".json") || entry === "status.json") {
                continue;
            }
            const backupId = entry.replace(/\.json$/, "");
            const payload = await this.readBackup(backupId);
            const createdAt = new Date(payload.createdAt);
            if (isOlderThan(createdAt, RETENTION_DAYS, now)) {
                await fs_1.promises.unlink(this.getBackupPath(backupId));
            }
        }
    }
    async readBackup(backupId) {
        const filePath = this.getBackupPath(backupId);
        const content = await fs_1.promises.readFile(filePath, "utf8");
        return JSON.parse(content);
    }
    validateBackup(payload) {
        if (!payload || !payload.data) {
            throw new common_1.BadRequestException("invalid backup");
        }
        const data = payload.data;
        const required = [
            "roles",
            "permissions",
            "rolePermissions",
            "employees",
            "authAccounts",
            "customers",
            "orders",
            "followUps",
            "exportApprovals",
            "refundApprovals",
            "orderApprovals",
            "auditLogs",
            "alerts"
        ];
        for (const key of required) {
            if (!Array.isArray(data[key])) {
                throw new common_1.BadRequestException("invalid backup");
            }
        }
    }
    async applyRestore(payload) {
        this.validateBackup(payload);
        const data = payload.data;
        await this.prisma.followUp.deleteMany();
        await this.prisma.orderApproval.deleteMany();
        await this.prisma.refundApproval.deleteMany();
        await this.prisma.exportApproval.deleteMany();
        await this.prisma.auditLog.deleteMany();
        await this.prisma.alert.deleteMany();
        await this.prisma.order.deleteMany();
        await this.prisma.customer.deleteMany();
        await this.prisma.authAccount.deleteMany();
        await this.prisma.employee.deleteMany();
        await this.prisma.rolePermission.deleteMany();
        await this.prisma.permission.deleteMany();
        await this.prisma.role.deleteMany();
        await createMany(this.prisma.role, withDates(stripId(data.roles), ["createdAt", "updatedAt"]));
        await createMany(this.prisma.permission, withDates(stripId(data.permissions), ["createdAt", "updatedAt"]));
        await createMany(this.prisma.rolePermission, stripId(data.rolePermissions));
        await createMany(this.prisma.employee, withDates(stripId(data.employees), ["hiredAt", "createdAt", "updatedAt"]));
        await createMany(this.prisma.authAccount, withDates(stripId(data.authAccounts), ["createdAt", "updatedAt"]));
        await createMany(this.prisma.customer, withDates(stripId(data.customers), ["birthDate", "createdAt", "updatedAt"]));
        await createMany(this.prisma.order, withDates(stripId(data.orders), ["orderedAt", "departureAt", "createdAt", "updatedAt"]));
        await createMany(this.prisma.followUp, withDates(stripId(data.followUps), ["followAt", "nextFollowAt", "createdAt", "updatedAt"]));
        await createMany(this.prisma.exportApproval, withDates(stripId(data.exportApprovals), ["requestedAt", "reviewedAt", "createdAt", "updatedAt"]));
        await createMany(this.prisma.refundApproval, withDates(stripId(data.refundApprovals), ["requestedAt", "reviewedAt", "createdAt", "updatedAt"]));
        await createMany(this.prisma.orderApproval, withDates(stripId(data.orderApprovals), ["requestedAt", "reviewedAt", "createdAt", "updatedAt"]));
        await createMany(this.prisma.auditLog, withDates(stripId(data.auditLogs), ["createdAt"]));
        await createMany(this.prisma.alert, withDates(stripId(data.alerts), ["createdAt", "updatedAt"]));
    }
    async collectSnapshot() {
        const [roles, permissions, rolePermissions, employees, authAccounts, customers, orders, followUps, exportApprovals, refundApprovals, orderApprovals, auditLogs, alerts] = await Promise.all([
            this.prisma.role.findMany(),
            this.prisma.permission.findMany(),
            this.prisma.rolePermission.findMany(),
            this.prisma.employee.findMany(),
            this.prisma.authAccount.findMany(),
            this.prisma.customer.findMany(),
            this.prisma.order.findMany(),
            this.prisma.followUp.findMany(),
            this.prisma.exportApproval.findMany(),
            this.prisma.refundApproval.findMany(),
            this.prisma.orderApproval.findMany(),
            this.prisma.auditLog.findMany(),
            this.prisma.alert.findMany()
        ]);
        return JSON.parse(JSON.stringify({
            roles,
            permissions,
            rolePermissions,
            employees,
            authAccounts,
            customers,
            orders,
            followUps,
            exportApprovals,
            refundApprovals,
            orderApprovals,
            auditLogs,
            alerts
        }));
    }
    getBackupDir() {
        return (0, path_1.join)(process.cwd(), "backups");
    }
    getBackupPath(backupId) {
        return (0, path_1.join)(this.getBackupDir(), `${backupId}.json`);
    }
    async ensureDir() {
        await fs_1.promises.mkdir(this.getBackupDir(), { recursive: true });
    }
    async loadStatus() {
        try {
            const content = await fs_1.promises.readFile(this.getStatusPath(), "utf8");
            return JSON.parse(content);
        }
        catch {
            return {};
        }
    }
    async updateStatus(patch) {
        const status = await this.loadStatus();
        const updated = { ...status, ...patch };
        await fs_1.promises.writeFile(this.getStatusPath(), JSON.stringify(updated), "utf8");
        return updated;
    }
    getStatusPath() {
        return (0, path_1.join)(this.getBackupDir(), "status.json");
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
exports.BackupService = BackupService;
exports.BackupService = BackupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BackupService);
function stripId(items) {
    return items.map((item) => {
        const { id, ...rest } = item;
        return rest;
    });
}
function withDates(items, fields) {
    return items.map((item) => {
        const next = { ...item };
        for (const field of fields) {
            if (next[field]) {
                next[field] = new Date(next[field]);
            }
        }
        return next;
    });
}
async function createMany(model, items) {
    if (items.length === 0) {
        return;
    }
    await model.createMany({ data: items });
}
function formatBackupId(date) {
    const pad = (value) => value.toString().padStart(2, "0");
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `backup-${y}${m}${d}-${hh}${mm}${ss}`;
}
function isOlderThan(date, days, now) {
    return now.getTime() - date.getTime() >= days * 24 * 60 * 60 * 1000;
}
function collectCounts(data) {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.length]));
}
function msUntilNextMonday2am(now) {
    const target = new Date(now);
    target.setHours(2, 0, 0, 0);
    const day = now.getDay();
    let daysToAdd = (8 - day) % 7;
    if (day === 1 && now.getTime() < target.getTime()) {
        daysToAdd = 0;
    }
    else if (daysToAdd === 0) {
        daysToAdd = 7;
    }
    target.setDate(target.getDate() + daysToAdd);
    return Math.max(0, target.getTime() - now.getTime());
}
