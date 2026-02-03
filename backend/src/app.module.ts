import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { EmployeesModule } from "./employees/employees.module";
import { CustomersModule } from "./customers/customers.module";
import { OrdersModule } from "./orders/orders.module";
import { FollowUpsModule } from "./followups/followups.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { ApprovalsModule } from "./approvals/approvals.module";
import { OrderApprovalsModule } from "./order-approvals/order-approvals.module";
import { AlertsModule } from "./alerts/alerts.module";
import { BackupModule } from "./backup/backup.module";
import { CompanyAccountsModule } from "./company-accounts/company-accounts.module";

@Module({
  imports: [
    AuthModule,
    EmployeesModule,
    CustomersModule,
    OrdersModule,
    FollowUpsModule,
    AuditLogsModule,
    ApprovalsModule,
    OrderApprovalsModule,
    AlertsModule,
    BackupModule,
    CompanyAccountsModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule { }
