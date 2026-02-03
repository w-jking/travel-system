import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { AuthPayload } from "./auth.types";
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) { }

  private getSecret() {
    return process.env.JWT_SECRET || "dev_secret";
  }

  private getLoginExpiresIn() {
    return process.env.JWT_EXPIRES_IN || "8h";
  }

  private buildPayload(employee: {
    employeeUuid: string;
    role: {
      roleUuid: string;
      code: string;
      permissions: { permission: { resource: string; action: string; scope: string } }[];
    };
  }): AuthPayload {
    const permissions = employee.role.permissions.map(
      (item) => `${item.permission.resource}:${item.permission.action}:${item.permission.scope}`
    );
    return {
      sub: employee.employeeUuid,
      roleUuid: employee.role.roleUuid,
      roleCode: employee.role.code,
      permissions
    };
  }

  private signToken(payload: AuthPayload, expiresIn?: string) {
    const secret = this.getSecret();
    if (expiresIn) {
      const options: SignOptions = { expiresIn: expiresIn as SignOptions["expiresIn"] };
      return jwt.sign(payload, secret, options);
    }
    return jwt.sign(payload, secret);
  }

  async login(username: string, password: string) {
    const account = await this.prisma.authAccount.findUnique({
      where: { username },
      include: {
        employee: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }
      }
    });
    if (!account) {
      throw new UnauthorizedException("invalid credentials");
    }
    const match = await bcrypt.compare(password, account.password);
    if (!match) {
      throw new UnauthorizedException("invalid credentials");
    }
    const payload = this.buildPayload(account.employee);
    const token = this.signToken(payload, this.getLoginExpiresIn());
    return { accessToken: token };
  }

  async createDevToken(input: {
    username?: string;
    employeeUuid?: string;
    permanent?: boolean;
    expiresIn?: string;
  }) {
    if (process.env.ALLOW_DEV_TOKEN !== "true") {
      throw new ForbiddenException("dev token disabled");
    }
    if (!input.username && !input.employeeUuid) {
      throw new BadRequestException("missing username or employeeUuid");
    }
    let employee:
      | {
        employeeUuid: string;
        role: {
          roleUuid: string;
          code: string;
          permissions: { permission: { resource: string; action: string; scope: string } }[];
        };
      }
      | null = null;
    if (input.username) {
      const account = await this.prisma.authAccount.findUnique({
        where: { username: input.username },
        include: {
          employee: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true }
                  }
                }
              }
            }
          }
        }
      });
      employee = account?.employee ?? null;
    } else if (input.employeeUuid) {
      employee = await this.prisma.employee.findUnique({
        where: { employeeUuid: input.employeeUuid },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true }
              }
            }
          }
        }
      });
    }
    if (!employee) {
      throw new UnauthorizedException("invalid user");
    }
    const payload = this.buildPayload(employee);
    const token = this.signToken(
      payload,
      input.permanent ? undefined : input.expiresIn || this.getLoginExpiresIn()
    );
    return { accessToken: token };
  }

  async getProfile(employeeId: string) {
    return this.prisma.employee.findUnique({
      where: { employeeUuid: employeeId },
      include: { role: true }
    });
  }

  async getMenu(roleCode: string) {
    const base = [
      { key: "dashboard", text: "工作台" },
      { key: "customers", text: "客户管理" },
      { key: "orders", text: "订单管理" },
      { key: "followups", text: "回访记录" }
    ];
    if (roleCode === "admin") {
      return [
        ...base,
        { key: "employees", text: "员工管理" },
        { key: "audit", text: "审计日志" },
        { key: "export-approvals", text: "导出审批" },
        { key: "reports", text: "统计报表" }
      ];
    }
    if (roleCode === "manager") {
      return [
        ...base,
        { key: "reports", text: "统计报表" },
        { key: "export-approvals", text: "导出审批" }
      ];
    }
    if (roleCode === "data_admin") {
      return [
        { key: "audit", text: "审计日志" },
        { key: "export-approvals", text: "导出审批" }
      ];
    }
    return base;
  }
}
