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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
let AuthService = class AuthService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    getSecret() {
        return process.env.JWT_SECRET || "dev_secret";
    }
    getLoginExpiresIn() {
        return process.env.JWT_EXPIRES_IN || "8h";
    }
    buildPayload(employee) {
        const permissions = employee.role.permissions.map((item) => `${item.permission.resource}:${item.permission.action}:${item.permission.scope}`);
        return {
            sub: employee.employeeUuid,
            roleUuid: employee.role.roleUuid,
            roleCode: employee.role.code,
            permissions
        };
    }
    signToken(payload, expiresIn) {
        const secret = this.getSecret();
        if (expiresIn) {
            const options = { expiresIn: expiresIn };
            return jsonwebtoken_1.default.sign(payload, secret, options);
        }
        return jsonwebtoken_1.default.sign(payload, secret);
    }
    async login(username, password) {
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
            throw new common_1.UnauthorizedException("invalid credentials");
        }
        const match = await bcryptjs_1.default.compare(password, account.password);
        if (!match) {
            throw new common_1.UnauthorizedException("invalid credentials");
        }
        const payload = this.buildPayload(account.employee);
        const token = this.signToken(payload, this.getLoginExpiresIn());
        return { accessToken: token };
    }
    async createDevToken(input) {
        if (process.env.ALLOW_DEV_TOKEN !== "true") {
            throw new common_1.ForbiddenException("dev token disabled");
        }
        if (!input.username && !input.employeeUuid) {
            throw new common_1.BadRequestException("missing username or employeeUuid");
        }
        let employee = null;
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
        }
        else if (input.employeeUuid) {
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
            throw new common_1.UnauthorizedException("invalid user");
        }
        const payload = this.buildPayload(employee);
        const token = this.signToken(payload, input.permanent ? undefined : input.expiresIn || this.getLoginExpiresIn());
        return { accessToken: token };
    }
    async getProfile(employeeId) {
        return this.prisma.employee.findUnique({
            where: { employeeUuid: employeeId },
            include: { role: true }
        });
    }
    async getMenu(roleCode) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
