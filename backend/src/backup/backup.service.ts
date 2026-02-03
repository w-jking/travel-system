import { BadRequestException, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { promises as fs } from "fs";
import { join } from "path";
import { PrismaService } from "../prisma.service";

type RunBackupInput = {
  note?: string;
};

type RestoreBackupInput = {
  backupId?: string;
  at?: string;
  dryRun?: boolean;
};

type BackupStatus = {
  lastBackupAt?: string;
  lastDrillAt?: string;
};

const BACKUP_INTERVAL_DAYS = 7;
const RETENTION_DAYS = 15;

@Injectable()
export class BackupService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) { }

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

  async run(actorUuid: string, input: RunBackupInput) {
    const result = await this.createBackup({ note: input.note });
    await this.logAction(actorUuid, "backup.run", "backup", result.backupId, null, result);
    return result;
  }

  async restore(actorUuid: string, input: RestoreBackupInput) {
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

  private scheduleNextRun() {
    const delay = msUntilNextMonday2am(new Date());
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.runScheduledTask().catch(() => undefined);
    }, delay);
  }

  private async runScheduledTask() {
    await this.runSchedule();
    this.scheduleNextRun();
  }

  private async runSchedule() {
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

  private async createBackup(input: { note?: string }) {
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
    await fs.writeFile(filePath, serialized, "utf8");
    await this.updateStatus({ lastBackupAt: payload.createdAt });
    const stats = await fs.stat(filePath);
    await this.cleanupRetention();
    return {
      backupId,
      createdAt: payload.createdAt,
      size: stats.size,
      counts: collectCounts(data)
    };
  }

  private async resolveBackup(input: RestoreBackupInput) {
    if (input.backupId) {
      const payload = await this.readBackup(input.backupId);
      return { backupId: input.backupId, payload };
    }
    if (input.at) {
      const at = new Date(input.at);
      if (Number.isNaN(at.getTime())) {
        throw new BadRequestException("invalid at");
      }
      const backups = await this.loadBackups();
      const candidates = backups
        .filter((item) => new Date(item.createdAt).getTime() <= at.getTime())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (candidates.length === 0) {
        throw new BadRequestException("backup not found");
      }
      const backupId = candidates[0].backupId;
      const payload = await this.readBackup(backupId);
      return { backupId, payload };
    }
    const latest = await this.getLatestBackup();
    if (!latest) {
      throw new BadRequestException("backup not found");
    }
    return { backupId: latest.backupId, payload: latest.payload };
  }

  private async getLatestBackup() {
    const backups = await this.loadBackups();
    if (backups.length === 0) {
      return null;
    }
    const sorted = backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const backupId = sorted[0].backupId;
    const payload = await this.readBackup(backupId);
    return { backupId, payload };
  }

  private async loadBackups() {
    await this.ensureDir();
    const entries = await fs.readdir(this.getBackupDir());
    const items = [];
    for (const entry of entries) {
      if (!entry.endsWith(".json") || entry === "status.json") {
        continue;
      }
      const backupId = entry.replace(/\.json$/, "");
      const payload = await this.readBackup(backupId);
      const stats = await fs.stat(this.getBackupPath(backupId));
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

  private async cleanupRetention() {
    const entries = await fs.readdir(this.getBackupDir());
    const now = new Date();
    for (const entry of entries) {
      if (!entry.endsWith(".json") || entry === "status.json") {
        continue;
      }
      const backupId = entry.replace(/\.json$/, "");
      const payload = await this.readBackup(backupId);
      const createdAt = new Date(payload.createdAt);
      if (isOlderThan(createdAt, RETENTION_DAYS, now)) {
        await fs.unlink(this.getBackupPath(backupId));
      }
    }
  }

  private async readBackup(backupId: string) {
    const filePath = this.getBackupPath(backupId);
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  }

  private validateBackup(payload: any) {
    if (!payload || !payload.data) {
      throw new BadRequestException("invalid backup");
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
        throw new BadRequestException("invalid backup");
      }
    }
  }

  private async applyRestore(payload: any) {
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

  private async collectSnapshot() {
    const [
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
    ] = await Promise.all([
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

  private getBackupDir() {
    return join(process.cwd(), "backups");
  }

  private getBackupPath(backupId: string) {
    return join(this.getBackupDir(), `${backupId}.json`);
  }

  private async ensureDir() {
    await fs.mkdir(this.getBackupDir(), { recursive: true });
  }

  private async loadStatus(): Promise<BackupStatus> {
    try {
      const content = await fs.readFile(this.getStatusPath(), "utf8");
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async updateStatus(patch: Partial<BackupStatus>) {
    const status = await this.loadStatus();
    const updated = { ...status, ...patch };
    await fs.writeFile(this.getStatusPath(), JSON.stringify(updated), "utf8");
    return updated;
  }

  private getStatusPath() {
    return join(this.getBackupDir(), "status.json");
  }

  private async logAction(
    actorUuid: string,
    action: string,
    targetType: string,
    targetUuid: string,
    beforeData: unknown,
    afterData: unknown
  ) {
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
}

function stripId<T extends { id?: number }>(items: T[]) {
  return items.map((item) => {
    const { id, ...rest } = item;
    return rest;
  });
}

function withDates<T extends Record<string, any>>(items: T[], fields: string[]) {
  return items.map((item) => {
    const next = { ...item } as Record<string, any>;
    for (const field of fields) {
      if (next[field]) {
        next[field] = new Date(next[field]);
      }
    }
    return next as T;
  });
}

async function createMany(model: { createMany: (args: { data: any[] }) => Promise<unknown> }, items: any[]) {
  if (items.length === 0) {
    return;
  }
  await model.createMany({ data: items });
}

function formatBackupId(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `backup-${y}${m}${d}-${hh}${mm}${ss}`;
}

function isOlderThan(date: Date, days: number, now: Date) {
  return now.getTime() - date.getTime() >= days * 24 * 60 * 60 * 1000;
}

function collectCounts(data: Record<string, any[]>) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.length]));
}

function msUntilNextMonday2am(now: Date) {
  const target = new Date(now);
  target.setHours(2, 0, 0, 0);
  const day = now.getDay();
  let daysToAdd = (8 - day) % 7;
  if (day === 1 && now.getTime() < target.getTime()) {
    daysToAdd = 0;
  } else if (daysToAdd === 0) {
    daysToAdd = 7;
  }
  target.setDate(target.getDate() + daysToAdd);
  return Math.max(0, target.getTime() - now.getTime());
}
