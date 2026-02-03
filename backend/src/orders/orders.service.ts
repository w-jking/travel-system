import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { AlertsService } from "../alerts/alerts.service";

type CreateOrderInput = {
  customerUuid: string;
  amount: number | string;
  payee?: string;
  companyAccountUuid?: string;
  status: string;
  ownerUuid?: string;
  orderedAt: string;
  departureAt?: string;
  route?: string;
  attachment?: string;
  notes?: string;
};

type UpdateOrderInput = {
  customerUuid?: string;
  amount?: number | string;
  payee?: string;
  companyAccountUuid?: string;
  ownerUuid?: string;
  orderedAt?: string;
  departureAt?: string;
  route?: string;
  attachment?: string;
  notes?: string;
};

const ORDER_STATUSES = ["待确认", "已收款", "已出团", "已完成", "已取消"];
const LARGE_ORDER_THRESHOLD = 100000;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService
  ) { }

  async findAll(roleCode: string, userUuid: string) {
    let where: any = undefined;
    if (roleCode === "staff") {
      where = { ownerUuid: userUuid };
    } else if (roleCode === "manager") {
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

  async create(roleCode: string, userUuid: string, input: CreateOrderInput) {
    if (!input.orderedAt) {
      throw new BadRequestException("orderedAt required");
    }
    if (!isValidStatus(input.status)) {
      throw new BadRequestException("invalid status");
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

  async update(roleCode: string, userUuid: string, id: string, input: UpdateOrderInput) {
    if (roleCode === "staff") {
      const exists = await this.prisma.order.findFirst({
        where: { orderUuid: id, ownerUuid: userUuid }
      });
      if (!exists) {
        throw new ForbiddenException("not allowed");
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

  async updateStatus(
    roleCode: string,
    userUuid: string,
    id: string,
    status: string,
    reason: string
  ) {
    if (!reason) {
      throw new BadRequestException("reason required");
    }
    if (!isValidStatus(status)) {
      throw new BadRequestException("invalid status");
    }
    const order = await this.prisma.order.findUnique({ where: { orderUuid: id } });
    if (!order) {
      throw new BadRequestException("order not found");
    }
    if (isLargeAmount(order.amount)) {
      const pendingApproval = await this.prisma.orderApproval.findFirst({
        where: { orderUuid: id, status: "待审批" }
      });
      if (pendingApproval && roleCode === "staff") {
        throw new ForbiddenException("approval required");
      }
    }
    if (roleCode === "staff") {
      const exists = await this.prisma.order.findFirst({
        where: { orderUuid: id, ownerUuid: userUuid }
      });
      if (!exists) {
        throw new ForbiddenException("not allowed");
      }
    }
    const before = await this.prisma.order.findUnique({ where: { orderUuid: id } });
    const updated = await this.prisma.order.update({
      where: { orderUuid: id },
      data: { status },
      include: { customer: true, owner: true, companyAccount: true }
    });
    await this.logAction(
      userUuid,
      "order.status",
      "order",
      id,
      before,
      { ...updated, reason }
    );
    return roleCode === "admin" ? updated : maskOrder(updated);
  }

  private normalizeCreateInput(roleCode: string, userUuid: string, input: CreateOrderInput) {
    const ownerUuid = roleCode === "staff" ? userUuid : (input.ownerUuid ?? userUuid);
    return {
      customer: { connect: { customerUuid: input.customerUuid } },
      amount: new Prisma.Decimal(input.amount),
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

  private normalizeUpdateInput(roleCode: string, userUuid: string, input: UpdateOrderInput) {
    const data = {
      customer: input.customerUuid ? { connect: { customerUuid: input.customerUuid } } : undefined,
      amount: input.amount !== undefined ? new Prisma.Decimal(input.amount) : undefined,
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
      if (data[key as keyof typeof data] === undefined) {
        delete data[key as keyof typeof data];
      }
    });
    return data;
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

  private async ensureOrderApproval(orderUuid: string, requesterUuid: string) {
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
}

function isValidStatus(status: string) {
  return ORDER_STATUSES.includes(status);
}

function isLargeAmount(value: number | string | { toString: () => string }) {
  const amount = typeof value === "number" ? value : Number(value.toString());
  if (Number.isNaN(amount)) {
    return false;
  }
  return amount > LARGE_ORDER_THRESHOLD;
}

function offlineMark(value?: string) {
  const text = (value ?? "").trim();
  return text ? `线下 - ${text}` : "线下";
}

function isOfflinePayee(value?: string) {
  return (value ?? "").includes("线下");
}

function maskOrder(order: any) {
  return {
    ...order,
    customer: order.customer ? maskCustomer(order.customer) : order.customer,
    owner: order.owner ? maskEmployee(order.owner) : order.owner
  };
}

function maskCustomer(customer: any) {
  return {
    ...customer,
    contact: maskContact(customer.contact),
    idNumber: customer.idNumber ? maskIdNumber(customer.idNumber) : customer.idNumber
  };
}

function maskEmployee(employee: any) {
  return {
    ...employee,
    phone: maskPhone(employee.phone),
    email: employee.email ? maskEmail(employee.email) : employee.email
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
