import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const roleConfigs = [
    { code: "admin", name: "管理员" },
    { code: "manager", name: "部门负责人" },
    { code: "staff", name: "一线员工" },
    { code: "data_admin", name: "数据管理员" }
  ];

  await Promise.all(
    roleConfigs.map((role) =>
      prisma.role.upsert({
        where: { code: role.code },
        update: { name: role.name, status: "active" },
        create: {
          code: role.code,
          name: role.name,
          status: "active"
        }
      })
    )
  );

  const roleByCode = new Map<string, string>();
  for (const role of roleConfigs) {
    const record = await prisma.role.findUnique({ where: { code: role.code } });
    if (record) {
      roleByCode.set(role.code, record.roleUuid);
    }
  }

  const employeeConfigs = [
    {
      name: "系统管理员",
      phone: "13800000000",
      department: "管理部",
      position: "管理员",
      roleCode: "admin",
      status: "active"
    },
    {
      name: "部门负责人",
      phone: "13800000001",
      department: "销售部",
      position: "负责人",
      roleCode: "manager",
      status: "active"
    },
    {
      name: "一线员工",
      phone: "13800000002",
      department: "销售部",
      position: "顾问",
      roleCode: "staff",
      status: "active"
    },
    {
      name: "数据管理员",
      phone: "13800000003",
      department: "数据部",
      position: "数据管理员",
      roleCode: "data_admin",
      status: "active"
    }
  ];

  const createdEmployees = [];
  for (const employee of employeeConfigs) {
    const roleUuid = roleByCode.get(employee.roleCode)!;
    const existing = await prisma.employee.findFirst({ where: { phone: employee.phone } });
    const record =
      existing ??
      (await prisma.employee.create({
        data: {
          name: employee.name,
          phone: employee.phone,
          department: employee.department,
          position: employee.position,
          status: employee.status,
          role: { connect: { roleUuid } }
        }
      }));
    createdEmployees.push(record);
  }

  const permissionInputs = [
    { resource: "employee", action: "read", scope: "all" },
    { resource: "employee", action: "write", scope: "all" },
    { resource: "customer", action: "read", scope: "all" },
    { resource: "customer", action: "write", scope: "all" },
    { resource: "customer", action: "read", scope: "own" },
    { resource: "customer", action: "write", scope: "own" },
    { resource: "order", action: "read", scope: "all" },
    { resource: "order", action: "write", scope: "all" },
    { resource: "order", action: "read", scope: "own" },
    { resource: "order", action: "write", scope: "own" },
    { resource: "audit", action: "read", scope: "all" },
    { resource: "export", action: "request", scope: "all" },
    { resource: "export", action: "approve", scope: "all" },
    { resource: "export", action: "execute", scope: "all" }
  ];

  await prisma.permission.createMany({
    data: permissionInputs,
    skipDuplicates: true
  });

  const permissions = await prisma.permission.findMany();
  const permissionMap = new Map(
    permissions.map((permission) => [
      `${permission.resource}:${permission.action}:${permission.scope}`,
      permission.permissionUuid
    ])
  );

  const rolePermissions = [
    {
      roleCode: "admin",
      keys: permissionInputs.map(
        (item) => `${item.resource}:${item.action}:${item.scope}`
      )
    },
    {
      roleCode: "manager",
      keys: [
        "employee:read:all",
        "customer:read:all",
        "customer:write:all",
        "order:read:all",
        "order:write:all",
        "audit:read:all",
        "export:approve:all",
        "export:execute:all"
      ]
    },
    {
      roleCode: "staff",
      keys: [
        "customer:read:own",
        "customer:write:own",
        "order:read:own",
        "order:write:own",
        "audit:read:all",
        "export:request:all"
      ]
    },
    {
      roleCode: "data_admin",
      keys: ["audit:read:all", "export:approve:all", "export:execute:all"]
    }
  ];

  for (const config of rolePermissions) {
    const roleUuid = roleByCode.get(config.roleCode)!;
    const data = config.keys
      .map((key) => permissionMap.get(key))
      .filter((permissionUuid): permissionUuid is string => Boolean(permissionUuid))
      .map((permissionUuid) => ({
        roleUuid,
        permissionUuid
      }));
    await prisma.rolePermission.createMany({
      data,
      skipDuplicates: true
    });
  }

  const accounts = [
    { username: "admin", password: "admin123", phone: "13800000000" },
    { username: "manager", password: "manager123", phone: "13800000001" },
    { username: "staff", password: "staff123", phone: "13800000002" },
    { username: "dataadmin", password: "data123", phone: "13800000003" }
  ];

  for (const account of accounts) {
    const employee = createdEmployees.find((e) => e.phone === account.phone)!;
    const passwordHash = await bcrypt.hash(account.password, 10);
    await prisma.authAccount.upsert({
      where: { username: account.username },
      update: {
        employeeUuid: employee.employeeUuid,
        password: passwordHash
      },
      create: {
        employeeUuid: employee.employeeUuid,
        username: account.username,
        password: passwordHash
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    throw error;
  });
