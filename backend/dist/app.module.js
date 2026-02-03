"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const employees_module_1 = require("./employees/employees.module");
const customers_module_1 = require("./customers/customers.module");
const orders_module_1 = require("./orders/orders.module");
const followups_module_1 = require("./followups/followups.module");
const audit_logs_module_1 = require("./audit-logs/audit-logs.module");
const approvals_module_1 = require("./approvals/approvals.module");
const order_approvals_module_1 = require("./order-approvals/order-approvals.module");
const alerts_module_1 = require("./alerts/alerts.module");
const backup_module_1 = require("./backup/backup.module");
const company_accounts_module_1 = require("./company-accounts/company-accounts.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            employees_module_1.EmployeesModule,
            customers_module_1.CustomersModule,
            orders_module_1.OrdersModule,
            followups_module_1.FollowUpsModule,
            audit_logs_module_1.AuditLogsModule,
            approvals_module_1.ApprovalsModule,
            order_approvals_module_1.OrderApprovalsModule,
            alerts_module_1.AlertsModule,
            backup_module_1.BackupModule,
            company_accounts_module_1.CompanyAccountsModule
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService]
    })
], AppModule);
