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
exports.ApprovalsController = void 0;
const common_1 = require("@nestjs/common");
const approvals_service_1 = require("./approvals.service");
const auth_guard_1 = require("../auth/auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
let ApprovalsController = class ApprovalsController {
    constructor(approvalsService) {
        this.approvalsService = approvalsService;
    }
    async listRefunds(req) {
        return this.approvalsService.listRefunds(req.user.roleCode, req.user.sub);
    }
    async requestRefund(req, body) {
        return this.approvalsService.requestRefund(req.user.roleCode, req.user.sub, body);
    }
    async approveRefund(req, body) {
        return this.approvalsService.approveRefund(req.user.sub, body);
    }
    async rejectRefund(req, body) {
        return this.approvalsService.rejectRefund(req.user.sub, body);
    }
    async listExports(req) {
        return this.approvalsService.listExports(req.user.roleCode, req.user.sub);
    }
    async requestExport(req, body) {
        return this.approvalsService.requestExport(req.user.sub, body);
    }
    async approveExport(req, body) {
        return this.approvalsService.approveExport(req.user.sub, body);
    }
    async rejectExport(req, body) {
        return this.approvalsService.rejectExport(req.user.sub, body);
    }
};
exports.ApprovalsController = ApprovalsController;
__decorate([
    (0, common_1.Post)("refund-approvals/list"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("admin", "manager", "staff", "data_admin"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ApprovalsController.prototype, "listRefunds", null);
__decorate([
    (0, common_1.Post)("refund-approvals/request"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("admin", "manager", "staff"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ApprovalsController.prototype, "requestRefund", null);
__decorate([
    (0, common_1.Post)("refund-approvals/approve"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("admin", "manager"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ApprovalsController.prototype, "approveRefund", null);
__decorate([
    (0, common_1.Post)("refund-approvals/reject"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("admin", "manager"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ApprovalsController.prototype, "rejectRefund", null);
__decorate([
    (0, common_1.Post)("export-approvals/list"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("admin", "manager", "staff", "data_admin"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ApprovalsController.prototype, "listExports", null);
__decorate([
    (0, common_1.Post)("export-approvals/request"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("admin", "manager", "staff"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ApprovalsController.prototype, "requestExport", null);
__decorate([
    (0, common_1.Post)("export-approvals/approve"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("admin", "data_admin"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ApprovalsController.prototype, "approveExport", null);
__decorate([
    (0, common_1.Post)("export-approvals/reject"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("admin", "data_admin"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ApprovalsController.prototype, "rejectExport", null);
exports.ApprovalsController = ApprovalsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [approvals_service_1.ApprovalsService])
], ApprovalsController);
