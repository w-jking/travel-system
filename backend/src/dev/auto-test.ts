import "reflect-metadata";
import { config } from "dotenv";
import { join } from "path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import request from "supertest";

type ApiResult<T> = { code: number; message: string; data: T };

async function main() {
  config({ path: join(process.cwd(), ".env") });
  config({ path: join(process.cwd(), "prisma", ".env") });
  const app = await NestFactory.create(AppModule);
  await app.init();
  const server = app.getHttpServer();

  const post = async <T>(url: string, token?: string, body?: any): Promise<T> => {
    let req = request(server).post(url).set("Content-Type", "application/json");
    if (token) req = req.set("Authorization", `Bearer ${token}`);
    const res = await req.send(body ?? {});
    const payload = res.body as Partial<ApiResult<T>> | undefined;
    if (payload && typeof payload.code === "number") {
      if (payload.code !== 200) {
        throw new Error(`${url} failed: ${payload.message ?? "unknown error"}`);
      }
      return payload.data as T;
    }
    if (res.status >= 200 && res.status < 300) {
      return res.body as T;
    }
    throw new Error(`${url} failed: ${res.status} ${res.text}`);
  };

  const adminLogin = await post<{ accessToken: string }>("/auth/login", undefined, {
    username: "admin",
    password: "admin123"
  });
  const staffLogin = await post<{ accessToken: string }>("/auth/login", undefined, {
    username: "staff",
    password: "staff123"
  });
  const dataAdminLogin = await post<{ accessToken: string }>("/auth/login", undefined, {
    username: "dataadmin",
    password: "data123"
  });
  const adminToken = adminLogin.accessToken;
  const staffToken = staffLogin.accessToken;
  const dataAdminToken = dataAdminLogin.accessToken;

  const menu = await post<any[]>("/auth/menu", adminToken, {});

  const companyAccounts = await post<any[]>("/company-accounts/list", adminToken, {});
  const accountList = Array.isArray(companyAccounts) ? companyAccounts : [];
  let companyAccountUuid: string | undefined = accountList[0]?.companyAccountUuid;
  if (!companyAccountUuid) {
    const created = await post<{ companyAccountUuid: string }>("/company-accounts/create", adminToken, {
      name: "对公账户A",
      bankName: "工商银行",
      accountNo: "6222****1234",
      status: "启用"
    });
    companyAccountUuid = created.companyAccountUuid;
  }

  const staffProfile = await post<{ employeeUuid: string }>("/auth/me", staffToken, {});
  const customer = await post<{ customerUuid: string; ownerUuid: string }>("/customers/create", staffToken, {
    name: "测试客户A",
    contact: "13812345678",
    level: "普通",
    notes: "自动化测试"
  });
  const order = await post<{ orderUuid: string }>("/orders/create", staffToken, {
    customerUuid: customer.customerUuid,
    amount: 1999,
    payee: "线下收款-现金",
    companyAccountUuid,
    status: "已收款",
    orderedAt: new Date().toISOString(),
    route: "华东五市",
    notes: "自动化测试-线下收款"
  });

  const alerts = await post<any[]>("/alerts/list", adminToken, { ruleCode: "offline_payee" });

  const exportReq = await post<{ exportApprovalUuid: string; status: string }>(
    "/export-approvals/request",
    staffToken,
    { scope: "customers", comment: "自动化测试导出" }
  );
  const exportApproved = await post<{ status: string }>(
    "/export-approvals/approve",
    adminToken,
    { exportApprovalUuid: exportReq.exportApprovalUuid, comment: "批准" }
  );

  const backupRun = await post<{ backupId: string }>("/backup/run", dataAdminToken, { note: "自动化测试备份" });
  const restoreDry = await post<any>("/backup/restore", adminToken, { backupId: backupRun.backupId, dryRun: true });

  const results = {
    adminMenuKeys: Array.isArray(menu) ? menu.map((m: any) => m.key) : [],
    companyAccountUuid,
    customerOwnerMatchesStaff: customer.ownerUuid === staffProfile.employeeUuid,
    orderUuid: order.orderUuid,
    offlineAlertsCount: Array.isArray(alerts) ? alerts.length : 0,
    exportApprovalStatusBefore: exportReq.status,
    exportApprovalStatusAfter: exportApproved.status,
    backupId: backupRun.backupId,
    restoreDryOk: !!restoreDry
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(results, null, 2));
  await app.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
