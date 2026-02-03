import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

type CreateCompanyAccountInput = {
  name: string;
  bankName?: string;
  accountNo?: string;
  status?: string;
  notes?: string;
};

const ACCOUNT_STATUSES = ["启用", "停用"];

@Injectable()
export class CompanyAccountsService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(roleCode: string, _userUuid: string) {
    const where = roleCode === "staff" ? { status: "启用" } : undefined;
    return this.prisma.companyAccount.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
  }

  async create(actorUuid: string, input: CreateCompanyAccountInput) {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException("name required");
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

  async updateStatus(actorUuid: string, accountUuid: string, status: string) {
    const nextStatus = normalizeStatus(status);
    const before = await this.prisma.companyAccount.findUnique({
      where: { accountUuid }
    });
    if (!before) {
      throw new BadRequestException("company account not found");
    }
    const updated = await this.prisma.companyAccount.update({
      where: { accountUuid },
      data: { status: nextStatus }
    });
    await this.logAction(actorUuid, "companyAccount.status", "companyAccount", accountUuid, before, updated);
    return updated;
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

function normalizeStatus(status?: string) {
  if (!status) {
    return "启用";
  }
  const normalized = status.trim();
  if (!ACCOUNT_STATUSES.includes(normalized)) {
    throw new BadRequestException("invalid status");
  }
  return normalized;
}
