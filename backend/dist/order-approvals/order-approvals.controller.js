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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderApprovalsController = void 0;
const common_1 = require("@nestjs/common");
const order_approvals_service_1 = require("./order-approvals.service");
const auth_guard_1 = require("../auth/auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
let OrderApprovalsController = class OrderApprovalsController {
    constructor(orderApprovalsService) {
        this.orderApprovalsService = orderApprovalsService;
    }
    async list(req) {
        return this.orderApprovalsService.list(req.user.roleCode, req.user.sub);
    }
    async request(req, body) {
        return this.orderApprovalsService.request(req.user.sub, body);
    }
    async approve(req, body) {
        return this.orderApprovalsService.approve(req.user.sub, body);
    }
    async reject(req, body) {
        return this.orderApprovalsService.reject(req.user.sub, body);
    }
};
exports.OrderApprovalsController = OrderApprovalsController;
__decorate([
    (0, common_1.Post)("list"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("admin", "manager", "staff", "data_admin"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrderApprovalsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)("request"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("admin", "manager", "staff"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrderApprovalsController.prototype, "request", null);
__decorate([
    (0, common_1.Post)("approve"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("admin", "manager"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrderApprovalsController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)("reject"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("admin", "manager"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrderApprovalsController.prototype, "reject", null);
exports.OrderApprovalsController = OrderApprovalsController = __decorate([
    (0, common_1.Controller)("order-approvals"),
    __metadata("design:paramtypes", [order_approvals_service_1.OrderApprovalsService])
], OrderApprovalsController);
