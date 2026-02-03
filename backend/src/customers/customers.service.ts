import { BadRequestException, Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

type CreateCustomerInput = {
  name: string;
  contact: string;
  level: string;
  ownerUuid?: string;
  idNumber?: string;
  birthDate?: string;
  preferences?: string;
  notes?: string;
};

type UpdateCustomerInput = {
  name?: string;
  contact?: string;
  level?: string;
  ownerUuid?: string;
  idNumber?: string;
  birthDate?: string;
  preferences?: string;
  notes?: string;
};

type RegradeInput = {
  months?: number;
  amountThreshold?: number | string;
  tripsThreshold?: number;
  customerUuid?: string;
};

type ImportCustomersInput = {
  rows: CreateCustomerInput[];
};

type ExportCustomersInput = {
  exportApprovalUuid: string;
};

type ReportCustomerValueInput = {
  from?: string;
  to?: string;
  customerUuid?: string;
  ownerUuid?: string;
  customerUuids?: string[];
  ownerUuids?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(roleCode: string, userUuid: string) {
    let where: any = undefined;
    if (roleCode === "staff") {
      where = { ownerUuid: userUuid };
    } else if (roleCode === "manager") {
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

  async create(roleCode: string, userUuid: string, input: CreateCustomerInput) {
    this.validateCreateInput(input);
    const ownerUuid = await this.resolveOwnerUuid(roleCode, userUuid, input.ownerUuid);
    await this.ensureActorExists(userUuid);
    try {
      const data = this.normalizeCreateInput(input, ownerUuid);
      const created = await this.prisma.customer.create({ data, include: { owner: true } });
      await this.logAction(userUuid, "customer.create", "customer", created.customerUuid, null, created);
      return roleCode === "admin" ? created : maskCustomer(created);
    } catch (error) {
      throw new BadRequestException(`customer create failed: ${this.formatError(error)}`);
    }
  }

  async update(roleCode: string, userUuid: string, id: string, input: UpdateCustomerInput) {
    if (roleCode === "staff") {
      const exists = await this.prisma.customer.findFirst({
        where: { customerUuid: id, ownerUuid: userUuid }
      });
      if (!exists) {
        throw new ForbiddenException("not allowed");
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

  async regrade(roleCode: string, userUuid: string, input: RegradeInput) {
    const months = input.months ?? 12;
    const amountThreshold = typeof input.amountThreshold === "number"
      ? input.amountThreshold
      : input.amountThreshold
        ? Number(input.amountThreshold.toString())
        : 50000;
    const tripsThreshold = input.tripsThreshold ?? 3;
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    const customerWhere: { ownerUuid?: string; customerUuid?: string } = {};
    if (roleCode === "staff") {
      customerWhere.ownerUuid = userUuid;
    }
    if (input.customerUuid) {
      customerWhere.customerUuid = input.customerUuid;
    }
    const customers = await this.prisma.customer.findMany({
      where: customerWhere
    });
    const changed: {
      customerUuid: string;
      beforeLevel: string;
      afterLevel: string;
      amountSum: number;
      tripsCount: number;
    }[] = [];
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

  async import(roleCode: string, userUuid: string, input: ImportCustomersInput) {
    const rows = input.rows ?? [];
    const created: any[] = [];
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
      } catch (error) {
        throw new BadRequestException(`customer import failed at row ${index + 1}: ${this.formatError(error)}`);
      }
    }
    return created;
  }

  async export(roleCode: string, userUuid: string, input: ExportCustomersInput) {
    await this.ensureExportApproved(roleCode, userUuid, input.exportApprovalUuid, "customer");
    let where: any = undefined;
    if (roleCode === "staff") {
      where = { ownerUuid: userUuid };
    } else if (roleCode === "manager") {
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

  async reportValue(roleCode: string, userUuid: string, input: ReportCustomerValueInput) {
    const range = this.parseDateRange(input);
    const customerWhere: {
      ownerUuid?: string | { in: string[] };
      customerUuid?: string | { in: string[] };
    } = {};
    if (roleCode === "staff") {
      customerWhere.ownerUuid = userUuid;
    } else {
      if (roleCode === "manager") {
        const managed = await this.getManagedOwnerUuids(userUuid);
        if (input.ownerUuids && input.ownerUuids.length > 0) {
          const filter = new Set(input.ownerUuids);
          customerWhere.ownerUuid = { in: managed.filter((id) => filter.has(id)) };
        } else {
          customerWhere.ownerUuid = { in: managed };
        }
      } else if (input.ownerUuids && input.ownerUuids.length > 0) {
        customerWhere.ownerUuid = { in: input.ownerUuids };
      } else if (input.ownerUuid) {
        customerWhere.ownerUuid = input.ownerUuid;
      }
    }
    if (input.customerUuids && input.customerUuids.length > 0) {
      customerWhere.customerUuid = { in: input.customerUuids };
    } else if (input.customerUuid) {
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
    const amountWhere: {
      customerUuid: { in: string[] };
      orderedAt?: { gte?: Date; lte?: Date };
    } = { customerUuid: { in: customerUuids } };
    if (range) {
      amountWhere.orderedAt = range;
    }
    const tripsWhere: {
      customerUuid: { in: string[] };
      departureAt?: { gte?: Date; lte?: Date };
    } = { customerUuid: { in: customerUuids } };
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
    const amountMap = new Map<string, { sum: number; count: number }>();
    for (const a of amountAgg) {
      amountMap.set(a.customerUuid, {
        sum: Number(a._sum.amount?.toString() ?? "0"),
        count: a._count._all
      });
    }
    const tripsMap = new Map<string, number>();
    for (const t of tripsAgg) {
      tripsMap.set(t.customerUuid, t._count._all);
    }
    const lastOrderMap = new Map<string, Date>();
    for (const o of lastOrder) {
      if (!lastOrderMap.has(o.customerUuid)) {
        lastOrderMap.set(o.customerUuid, o.orderedAt);
      }
    }
    const regradeCountMap = new Map<string, number>();
    const lastRegradeMap = new Map<string, Date>();
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

  private sortCustomerReport(items: Array<{
    customerUuid: string;
    name: string;
    level: string;
    ownerUuid: string;
    amountSum: number;
    ordersCount: number;
    tripsCount: number;
    lastOrderedAt: Date | null;
    regradeCount: number;
    lastRegradeAt: Date | null;
  }>, input: ReportCustomerValueInput) {
    const sortBy = input.sortBy ?? "amountSum";
    const order = input.sortOrder === "asc" ? 1 : -1;
    const valueOf = (item: typeof items[number]) => {
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

  private paginate<T>(items: T[], input: { page?: number; pageSize?: number }) {
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

  private validateCreateInput(input: CreateCustomerInput) {
    const missing: string[] = [];
    if (!input.name) missing.push("name");
    if (!input.contact) missing.push("contact");
    if (!input.level) missing.push("level");
    if (missing.length > 0) {
      throw new BadRequestException(`missing fields: ${missing.join(", ")}`);
    }
    if (input.birthDate) {
      this.parseDate(input.birthDate, "birthDate");
    }
  }

  private parseDate(value: string, field: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} invalid`);
    }
    return date;
  }

  private parseDateRange(input: { from?: string; to?: string }) {
    if (!input.from && !input.to) {
      return undefined;
    }
    return {
      gte: input.from ? this.parseDate(input.from, "from") : undefined,
      lte: input.to ? this.parseDate(input.to, "to") : undefined
    };
  }

  private formatError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }
    return "unknown error";
  }

  private async resolveOwnerUuid(roleCode: string, userUuid: string, inputOwnerUuid?: string) {
    const ownerUuid = roleCode === "staff" ? userUuid : (inputOwnerUuid ?? userUuid);
    if (!ownerUuid) {
      throw new BadRequestException("owner required");
    }
    await this.ensureOwnerExists(ownerUuid);
    return ownerUuid;
  }

  private async ensureOwnerExists(ownerUuid: string) {
    const owner = await this.prisma.employee.findUnique({ where: { employeeUuid: ownerUuid } });
    if (!owner) {
      throw new BadRequestException("owner not found");
    }
  }

  private async ensureActorExists(actorUuid: string) {
    const actor = await this.prisma.employee.findUnique({ where: { employeeUuid: actorUuid } });
    if (!actor) {
      throw new BadRequestException("actor not found");
    }
  }

  private async getActorDepartment(actorUuid: string) {
    const actor = await this.prisma.employee.findUnique({
      where: { employeeUuid: actorUuid },
      select: { department: true }
    });
    if (!actor?.department) {
      throw new BadRequestException("actor not found");
    }
    return actor.department;
  }

  private async getManagedOwnerUuids(actorUuid: string) {
    const dept = await this.getActorDepartment(actorUuid);
    const employees = await this.prisma.employee.findMany({
      where: { department: dept },
      select: { employeeUuid: true }
    });
    return employees.map((e) => e.employeeUuid);
  }

  private isExportScopeMatch(scope: string, expectedScope: string) {
    const raw = (scope || "").toLowerCase();
    const normalized = raw.split(":")[0] || "";
    const singular = normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
    return singular === expectedScope.toLowerCase();
  }

  private normalizeCreateInput(input: CreateCustomerInput, ownerUuid: string) {
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

  private normalizeUpdateInput(
    roleCode: string,
    userUuid: string,
    input: UpdateCustomerInput
  ) {
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
      if (data[key as keyof typeof data] === undefined) {
        delete data[key as keyof typeof data];
      }
    });
    return data;
  }

  private async ensureExportApproved(
    roleCode: string,
    userUuid: string,
    exportApprovalUuid: string,
    expectedScope?: string
  ) {
    if (!exportApprovalUuid) {
      throw new ForbiddenException("export approval required");
    }
    const approval = await this.prisma.exportApproval.findUnique({
      where: { exportApprovalUuid }
    });
    if (!approval) {
      throw new ForbiddenException("approval not found");
    }
    if (expectedScope && !this.isExportScopeMatch(approval.scope, expectedScope)) {
      throw new ForbiddenException("export scope mismatch");
    }
    if (approval.status !== "已通过") {
      throw new ForbiddenException("approval not approved");
    }
    if (roleCode === "staff" && approval.requesterUuid !== userUuid) {
      throw new ForbiddenException("not allowed");
    }
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

function maskCustomer(customer: any) {
  return {
    ...customer,
    contact: maskContact(customer.contact),
    idNumber: customer.idNumber ? maskIdNumber(customer.idNumber) : customer.idNumber
  };
}

function maskContact(value: string) {
  if (!value) {
    return value;
  }
  if (value.includes("@")) {
    return maskEmail(value);
  }
  return maskPhone(value);
}

function maskPhone(value: string) {
  if (!value || value.length < 7) {
    return value;
  }
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

function maskIdNumber(value: string) {
  if (!value || value.length <= 6) {
    return value;
  }
  const start = value.slice(0, 4);
  const end = value.slice(-2);
  return `${start}****${end}`;
}

function maskEmail(value: string) {
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
