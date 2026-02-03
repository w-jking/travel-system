import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

type CreateFollowUpInput = {
  customerUuid: string;
  orderUuid?: string;
  followAt: string;
  channel: string;
  request: string;
  result: string;
  nextFollowAt?: string;
  attachment?: string;
};

type UpdateFollowUpInput = {
  followAt?: string;
  channel?: string;
  request?: string;
  result?: string;
  nextFollowAt?: string;
  attachment?: string;
};

@Injectable()
export class FollowUpsService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(roleCode: string, userUuid: string) {
    let where: any = undefined;
    if (roleCode === "staff") {
      where = { ownerUuid: userUuid };
    } else if (roleCode === "manager") {
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

  async create(roleCode: string, userUuid: string, input: CreateFollowUpInput) {
    const data = this.normalizeCreateInput(roleCode, userUuid, input);
    const created = await this.prisma.followUp.create({
      data,
      include: { customer: true, order: true, owner: true }
    });
    await this.logAction(userUuid, "followup.create", "followup", created.followUpUuid, null, created);
    return roleCode === "admin" ? created : maskFollowUp(created);
  }

  async update(roleCode: string, userUuid: string, id: string, input: UpdateFollowUpInput) {
    if (roleCode === "staff") {
      const exists = await this.prisma.followUp.findFirst({
        where: { followUpUuid: id, ownerUuid: userUuid }
      });
      if (!exists) {
        throw new ForbiddenException("not allowed");
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

  private normalizeCreateInput(
    roleCode: string,
    userUuid: string,
    input: CreateFollowUpInput
  ) {
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

  private normalizeUpdateInput(input: UpdateFollowUpInput) {
    const data = {
      followAt: input.followAt ? new Date(input.followAt) : undefined,
      channel: input.channel,
      request: input.request,
      result: input.result,
      nextFollowAt: input.nextFollowAt ? new Date(input.nextFollowAt) : undefined,
      attachment: input.attachment
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

  private async getActorDepartment(actorUuid: string) {
    const actor = await this.prisma.employee.findUnique({
      where: { employeeUuid: actorUuid },
      select: { department: true }
    });
    if (!actor?.department) {
      throw new ForbiddenException("actor not found");
    }
    return actor.department;
  }
}

function maskFollowUp(followUp: any) {
  return {
    ...followUp,
    customer: followUp.customer ? maskCustomer(followUp.customer) : followUp.customer,
    owner: followUp.owner ? maskEmployee(followUp.owner) : followUp.owner
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
