-- Generate UUIDs without requiring extensions (inline expression)
-- ((random hex segments)::uuid)

-- Drop existing foreign keys referencing old id columns
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_actorId_fkey";
ALTER TABLE "AuthAccount" DROP CONSTRAINT IF EXISTS "AuthAccount_employeeId_fkey";
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_ownerId_fkey";
ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_roleId_fkey";
ALTER TABLE "ExportApproval" DROP CONSTRAINT IF EXISTS "ExportApproval_requesterId_fkey";
ALTER TABLE "ExportApproval" DROP CONSTRAINT IF EXISTS "ExportApproval_reviewerId_fkey";
ALTER TABLE "FollowUp" DROP CONSTRAINT IF EXISTS "FollowUp_customerId_fkey";
ALTER TABLE "FollowUp" DROP CONSTRAINT IF EXISTS "FollowUp_orderId_fkey";
ALTER TABLE "FollowUp" DROP CONSTRAINT IF EXISTS "FollowUp_ownerId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_customerId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_ownerId_fkey";
ALTER TABLE "RefundApproval" DROP CONSTRAINT IF EXISTS "RefundApproval_orderId_fkey";
ALTER TABLE "RefundApproval" DROP CONSTRAINT IF EXISTS "RefundApproval_requesterId_fkey";
ALTER TABLE "RefundApproval" DROP CONSTRAINT IF EXISTS "RefundApproval_reviewerId_fkey";
ALTER TABLE "RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_permissionId_fkey";
ALTER TABLE "RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_roleId_fkey";
DROP INDEX IF EXISTS "AuthAccount_employeeId_key";

-- Add new UUID columns as NULLABLE for backfill
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "code" TEXT, ADD COLUMN IF NOT EXISTS "roleUuid" UUID;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "employeeUuid" UUID, ADD COLUMN IF NOT EXISTS "roleUuid" UUID;
ALTER TABLE "Permission" ADD COLUMN IF NOT EXISTS "permissionUuid" UUID;
ALTER TABLE "RolePermission" ADD COLUMN IF NOT EXISTS "permissionUuid" UUID, ADD COLUMN IF NOT EXISTS "roleUuid" UUID;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "customerUuid" UUID, ADD COLUMN IF NOT EXISTS "ownerUuid" UUID;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderUuid" UUID, ADD COLUMN IF NOT EXISTS "customerUuid" UUID, ADD COLUMN IF NOT EXISTS "ownerUuid" UUID;
ALTER TABLE "FollowUp" ADD COLUMN IF NOT EXISTS "followUpUuid" UUID, ADD COLUMN IF NOT EXISTS "customerUuid" UUID, ADD COLUMN IF NOT EXISTS "orderUuid" UUID, ADD COLUMN IF NOT EXISTS "ownerUuid" UUID;
ALTER TABLE "AuthAccount" ADD COLUMN IF NOT EXISTS "authAccountUuid" UUID, ADD COLUMN IF NOT EXISTS "employeeUuid" UUID;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "auditLogUuid" UUID, ADD COLUMN IF NOT EXISTS "actorUuid" UUID, ADD COLUMN IF NOT EXISTS "targetUuid" TEXT;
ALTER TABLE "ExportApproval" ADD COLUMN IF NOT EXISTS "exportApprovalUuid" UUID, ADD COLUMN IF NOT EXISTS "requesterUuid" UUID, ADD COLUMN IF NOT EXISTS "reviewerUuid" UUID;
ALTER TABLE "RefundApproval" ADD COLUMN IF NOT EXISTS "refundApprovalUuid" UUID, ADD COLUMN IF NOT EXISTS "orderUuid" UUID, ADD COLUMN IF NOT EXISTS "requesterUuid" UUID, ADD COLUMN IF NOT EXISTS "reviewerUuid" UUID;

-- Backfill UUIDs and codes
UPDATE "Role" SET "roleUuid" = COALESCE("roleUuid", (
  lpad(to_hex(floor(random()*4294967295)::int), 8, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*4294967295)::int), 12, '0')
)::uuid);
UPDATE "Role" SET "code" =
  CASE
    WHEN "code" IS NOT NULL THEN "code"
    WHEN "name" = '管理员' THEN 'admin'
    WHEN "name" = '部门负责人' THEN 'manager'
    WHEN "name" = '一线员工' THEN 'staff'
    WHEN "name" = '数据管理员' THEN 'data_admin'
    ELSE lower(regexp_replace("name", '[^a-zA-Z0-9]+', '_', 'g'))
  END;

UPDATE "Employee" SET "employeeUuid" = COALESCE("employeeUuid", (
  lpad(to_hex(floor(random()*4294967295)::int), 8, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*4294967295)::int), 12, '0')
)::uuid);
UPDATE "Employee" e SET "roleUuid" = r."roleUuid" FROM "Role" r WHERE e."roleId" = r."id";

UPDATE "Permission" SET "permissionUuid" = COALESCE("permissionUuid", (
  lpad(to_hex(floor(random()*4294967295)::int), 8, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*4294967295)::int), 12, '0')
)::uuid);

UPDATE "RolePermission" rp SET "roleUuid" = r."roleUuid" FROM "Role" r WHERE rp."roleId" = r."id";
UPDATE "RolePermission" rp SET "permissionUuid" = p."permissionUuid" FROM "Permission" p WHERE rp."permissionId" = p."id";

UPDATE "Customer" SET "customerUuid" = COALESCE("customerUuid", (
  lpad(to_hex(floor(random()*4294967295)::int), 8, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*4294967295)::int), 12, '0')
)::uuid);
UPDATE "Customer" c SET "ownerUuid" = e."employeeUuid" FROM "Employee" e WHERE c."ownerId" = e."id";

UPDATE "Order" SET "orderUuid" = COALESCE("orderUuid", (
  lpad(to_hex(floor(random()*4294967295)::int), 8, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*4294967295)::int), 12, '0')
)::uuid);
UPDATE "Order" o SET "customerUuid" = c."customerUuid" FROM "Customer" c WHERE o."customerId" = c."id";
UPDATE "Order" o SET "ownerUuid" = e."employeeUuid" FROM "Employee" e WHERE o."ownerId" = e."id";

UPDATE "FollowUp" SET "followUpUuid" = COALESCE("followUpUuid", (
  lpad(to_hex(floor(random()*4294967295)::int), 8, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*4294967295)::int), 12, '0')
)::uuid);
UPDATE "FollowUp" f SET "customerUuid" = c."customerUuid" FROM "Customer" c WHERE f."customerId" = c."id";
UPDATE "FollowUp" f SET "orderUuid" = o."orderUuid" FROM "Order" o WHERE f."orderId" = o."id";
UPDATE "FollowUp" f SET "ownerUuid" = e."employeeUuid" FROM "Employee" e WHERE f."ownerId" = e."id";

UPDATE "AuthAccount" SET "authAccountUuid" = COALESCE("authAccountUuid", (
  lpad(to_hex(floor(random()*4294967295)::int), 8, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*4294967295)::int), 12, '0')
)::uuid);
UPDATE "AuthAccount" a SET "employeeUuid" = e."employeeUuid" FROM "Employee" e WHERE a."employeeId" = e."id";

UPDATE "AuditLog" SET "auditLogUuid" = COALESCE("auditLogUuid", (
  lpad(to_hex(floor(random()*4294967295)::int), 8, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*4294967295)::int), 12, '0')
)::uuid);
UPDATE "AuditLog" al SET "actorUuid" = e."employeeUuid" FROM "Employee" e WHERE al."actorId" = e."id";
UPDATE "AuditLog" SET "targetUuid" = COALESCE("targetUuid", "targetId");

UPDATE "ExportApproval" SET "exportApprovalUuid" = COALESCE("exportApprovalUuid", (
  lpad(to_hex(floor(random()*4294967295)::int), 8, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*4294967295)::int), 12, '0')
)::uuid);
UPDATE "ExportApproval" ea SET "requesterUuid" = e."employeeUuid" FROM "Employee" e WHERE ea."requesterId" = e."id";
UPDATE "ExportApproval" ea SET "reviewerUuid" = e."employeeUuid" FROM "Employee" e WHERE ea."reviewerId" = e."id";

UPDATE "RefundApproval" SET "refundApprovalUuid" = COALESCE("refundApprovalUuid", (
  lpad(to_hex(floor(random()*4294967295)::int), 8, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*65535)::int), 4, '0') || '-' ||
  lpad(to_hex(floor(random()*4294967295)::int), 12, '0')
)::uuid);
UPDATE "RefundApproval" ra SET "orderUuid" = o."orderUuid" FROM "Order" o WHERE ra."orderId" = o."id";
UPDATE "RefundApproval" ra SET "requesterUuid" = e."employeeUuid" FROM "Employee" e WHERE ra."requesterId" = e."id";
UPDATE "RefundApproval" ra SET "reviewerUuid" = e."employeeUuid" FROM "Employee" e WHERE ra."reviewerId" = e."id";

-- Make new columns NOT NULL and set primary keys
ALTER TABLE "Role" ALTER COLUMN "roleUuid" SET NOT NULL;
ALTER TABLE "Role" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "Role" DROP CONSTRAINT IF EXISTS "Role_pkey";
ALTER TABLE "Role" ADD CONSTRAINT "Role_pkey" PRIMARY KEY ("roleUuid");
CREATE UNIQUE INDEX IF NOT EXISTS "Role_code_key" ON "Role"("code");

ALTER TABLE "Employee" ALTER COLUMN "employeeUuid" SET NOT NULL;
ALTER TABLE "Employee" ALTER COLUMN "roleUuid" SET NOT NULL;
ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_pkey";
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_pkey" PRIMARY KEY ("employeeUuid");

ALTER TABLE "Permission" ALTER COLUMN "permissionUuid" SET NOT NULL;
ALTER TABLE "Permission" DROP CONSTRAINT IF EXISTS "Permission_pkey";
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_pkey" PRIMARY KEY ("permissionUuid");
CREATE UNIQUE INDEX IF NOT EXISTS "Permission_resource_action_scope_key" ON "Permission"("resource","action","scope");

ALTER TABLE "RolePermission" ALTER COLUMN "roleUuid" SET NOT NULL;
ALTER TABLE "RolePermission" ALTER COLUMN "permissionUuid" SET NOT NULL;
ALTER TABLE "RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_pkey";
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleUuid","permissionUuid");

ALTER TABLE "Customer" ALTER COLUMN "customerUuid" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "ownerUuid" SET NOT NULL;
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_pkey";
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_pkey" PRIMARY KEY ("customerUuid");

ALTER TABLE "Order" ALTER COLUMN "orderUuid" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "customerUuid" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "ownerUuid" SET NOT NULL;
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_pkey";
ALTER TABLE "Order" ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("orderUuid");

ALTER TABLE "FollowUp" ALTER COLUMN "followUpUuid" SET NOT NULL;
ALTER TABLE "FollowUp" ALTER COLUMN "customerUuid" SET NOT NULL;
ALTER TABLE "FollowUp" ALTER COLUMN "ownerUuid" SET NOT NULL;
ALTER TABLE "FollowUp" DROP CONSTRAINT IF EXISTS "FollowUp_pkey";
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("followUpUuid");

ALTER TABLE "AuthAccount" ALTER COLUMN "authAccountUuid" SET NOT NULL;
ALTER TABLE "AuthAccount" ALTER COLUMN "employeeUuid" SET NOT NULL;
ALTER TABLE "AuthAccount" DROP CONSTRAINT IF EXISTS "AuthAccount_pkey";
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("authAccountUuid");
CREATE UNIQUE INDEX IF NOT EXISTS "AuthAccount_employeeUuid_key" ON "AuthAccount"("employeeUuid");
CREATE UNIQUE INDEX IF NOT EXISTS "AuthAccount_username_key" ON "AuthAccount"("username");

ALTER TABLE "AuditLog" ALTER COLUMN "auditLogUuid" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "actorUuid" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "targetUuid" SET NOT NULL;
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_pkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("auditLogUuid");

ALTER TABLE "ExportApproval" ALTER COLUMN "exportApprovalUuid" SET NOT NULL;
ALTER TABLE "ExportApproval" ALTER COLUMN "requesterUuid" SET NOT NULL;
ALTER TABLE "ExportApproval" ALTER COLUMN "reviewerUuid" SET NOT NULL;
ALTER TABLE "ExportApproval" DROP CONSTRAINT IF EXISTS "ExportApproval_pkey";
ALTER TABLE "ExportApproval" ADD CONSTRAINT "ExportApproval_pkey" PRIMARY KEY ("exportApprovalUuid");

ALTER TABLE "RefundApproval" ALTER COLUMN "refundApprovalUuid" SET NOT NULL;
ALTER TABLE "RefundApproval" ALTER COLUMN "orderUuid" SET NOT NULL;
ALTER TABLE "RefundApproval" ALTER COLUMN "requesterUuid" SET NOT NULL;
ALTER TABLE "RefundApproval" ALTER COLUMN "reviewerUuid" SET NOT NULL;
ALTER TABLE "RefundApproval" DROP CONSTRAINT IF EXISTS "RefundApproval_pkey";
ALTER TABLE "RefundApproval" ADD CONSTRAINT "RefundApproval_pkey" PRIMARY KEY ("refundApprovalUuid");

-- Add foreign keys referencing new UUID columns
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_roleUuid_fkey" FOREIGN KEY ("roleUuid") REFERENCES "Role"("roleUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_ownerUuid_fkey" FOREIGN KEY ("ownerUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerUuid_fkey" FOREIGN KEY ("customerUuid") REFERENCES "Customer"("customerUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_ownerUuid_fkey" FOREIGN KEY ("ownerUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_customerUuid_fkey" FOREIGN KEY ("customerUuid") REFERENCES "Customer"("customerUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_orderUuid_fkey" FOREIGN KEY ("orderUuid") REFERENCES "Order"("orderUuid") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_ownerUuid_fkey" FOREIGN KEY ("ownerUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_employeeUuid_fkey" FOREIGN KEY ("employeeUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleUuid_fkey" FOREIGN KEY ("roleUuid") REFERENCES "Role"("roleUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionUuid_fkey" FOREIGN KEY ("permissionUuid") REFERENCES "Permission"("permissionUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUuid_fkey" FOREIGN KEY ("actorUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExportApproval" ADD CONSTRAINT "ExportApproval_requesterUuid_fkey" FOREIGN KEY ("requesterUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExportApproval" ADD CONSTRAINT "ExportApproval_reviewerUuid_fkey" FOREIGN KEY ("reviewerUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefundApproval" ADD CONSTRAINT "RefundApproval_orderUuid_fkey" FOREIGN KEY ("orderUuid") REFERENCES "Order"("orderUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefundApproval" ADD CONSTRAINT "RefundApproval_requesterUuid_fkey" FOREIGN KEY ("requesterUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefundApproval" ADD CONSTRAINT "RefundApproval_reviewerUuid_fkey" FOREIGN KEY ("reviewerUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old columns after successful backfill
ALTER TABLE "AuthAccount" DROP COLUMN IF EXISTS "employeeId";
ALTER TABLE "AuthAccount" DROP COLUMN IF EXISTS "id";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "id";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "ownerId";
ALTER TABLE "Employee" DROP COLUMN IF EXISTS "id";
ALTER TABLE "Employee" DROP COLUMN IF EXISTS "roleId";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "customerId";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "id";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "ownerId";
ALTER TABLE "FollowUp" DROP COLUMN IF EXISTS "customerId";
ALTER TABLE "FollowUp" DROP COLUMN IF EXISTS "id";
ALTER TABLE "FollowUp" DROP COLUMN IF EXISTS "orderId";
ALTER TABLE "FollowUp" DROP COLUMN IF EXISTS "ownerId";
ALTER TABLE "Permission" DROP COLUMN IF EXISTS "id";
ALTER TABLE "Role" DROP COLUMN IF EXISTS "id";
ALTER TABLE "RolePermission" DROP COLUMN IF EXISTS "permissionId";
ALTER TABLE "RolePermission" DROP COLUMN IF EXISTS "roleId";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "actorId";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "id";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "targetId";
ALTER TABLE "ExportApproval" DROP COLUMN IF EXISTS "id";
ALTER TABLE "ExportApproval" DROP COLUMN IF EXISTS "requesterId";
ALTER TABLE "ExportApproval" DROP COLUMN IF EXISTS "reviewerId";
ALTER TABLE "RefundApproval" DROP COLUMN IF EXISTS "id";
ALTER TABLE "RefundApproval" DROP COLUMN IF EXISTS "orderId";
ALTER TABLE "RefundApproval" DROP COLUMN IF EXISTS "requesterId";
ALTER TABLE "RefundApproval" DROP COLUMN IF EXISTS "reviewerId";
