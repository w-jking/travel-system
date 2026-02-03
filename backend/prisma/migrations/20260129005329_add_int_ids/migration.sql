/*
  Warnings:

  - The primary key for the `Alert` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `AuditLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `AuthAccount` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Customer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Employee` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ExportApproval` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `FollowUp` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Order` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `OrderApproval` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Permission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `RefundApproval` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Role` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `RolePermission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[alertUuid]` on the table `Alert` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[auditLogUuid]` on the table `AuditLog` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[authAccountUuid]` on the table `AuthAccount` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[customerUuid]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employeeUuid]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[exportApprovalUuid]` on the table `ExportApproval` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[followUpUuid]` on the table `FollowUp` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orderUuid]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orderApprovalUuid]` on the table `OrderApproval` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[permissionUuid]` on the table `Permission` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[refundApprovalUuid]` on the table `RefundApproval` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[roleUuid]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[roleUuid,permissionUuid]` on the table `RolePermission` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_actorUuid_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorUuid_fkey";

-- DropForeignKey
ALTER TABLE "AuthAccount" DROP CONSTRAINT "AuthAccount_employeeUuid_fkey";

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_ownerUuid_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_roleUuid_fkey";

-- DropForeignKey
ALTER TABLE "ExportApproval" DROP CONSTRAINT "ExportApproval_requesterUuid_fkey";

-- DropForeignKey
ALTER TABLE "ExportApproval" DROP CONSTRAINT "ExportApproval_reviewerUuid_fkey";

-- DropForeignKey
ALTER TABLE "FollowUp" DROP CONSTRAINT "FollowUp_customerUuid_fkey";

-- DropForeignKey
ALTER TABLE "FollowUp" DROP CONSTRAINT "FollowUp_orderUuid_fkey";

-- DropForeignKey
ALTER TABLE "FollowUp" DROP CONSTRAINT "FollowUp_ownerUuid_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerUuid_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_ownerUuid_fkey";

-- DropForeignKey
ALTER TABLE "OrderApproval" DROP CONSTRAINT "OrderApproval_orderUuid_fkey";

-- DropForeignKey
ALTER TABLE "OrderApproval" DROP CONSTRAINT "OrderApproval_requesterUuid_fkey";

-- DropForeignKey
ALTER TABLE "OrderApproval" DROP CONSTRAINT "OrderApproval_reviewerUuid_fkey";

-- DropForeignKey
ALTER TABLE "RefundApproval" DROP CONSTRAINT "RefundApproval_orderUuid_fkey";

-- DropForeignKey
ALTER TABLE "RefundApproval" DROP CONSTRAINT "RefundApproval_requesterUuid_fkey";

-- DropForeignKey
ALTER TABLE "RefundApproval" DROP CONSTRAINT "RefundApproval_reviewerUuid_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_roleUuid_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_permissionUuid_fkey";

-- AlterTable
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Alert_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "AuthAccount" DROP CONSTRAINT "AuthAccount_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Customer_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Employee_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ExportApproval" DROP CONSTRAINT "ExportApproval_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "ExportApproval_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "FollowUp" DROP CONSTRAINT "FollowUp_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Order" DROP CONSTRAINT "Order_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "OrderApproval" DROP CONSTRAINT "OrderApproval_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "OrderApproval_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Permission_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "RefundApproval" DROP CONSTRAINT "RefundApproval_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "RefundApproval_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Role" DROP CONSTRAINT "Role_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Role_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_alertUuid_key" ON "Alert"("alertUuid");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_auditLogUuid_key" ON "AuditLog"("auditLogUuid");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_authAccountUuid_key" ON "AuthAccount"("authAccountUuid");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerUuid_key" ON "Customer"("customerUuid");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeUuid_key" ON "Employee"("employeeUuid");

-- CreateIndex
CREATE UNIQUE INDEX "ExportApproval_exportApprovalUuid_key" ON "ExportApproval"("exportApprovalUuid");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUp_followUpUuid_key" ON "FollowUp"("followUpUuid");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderUuid_key" ON "Order"("orderUuid");

-- CreateIndex
CREATE UNIQUE INDEX "OrderApproval_orderApprovalUuid_key" ON "OrderApproval"("orderApprovalUuid");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_permissionUuid_key" ON "Permission"("permissionUuid");

-- CreateIndex
CREATE UNIQUE INDEX "RefundApproval_refundApprovalUuid_key" ON "RefundApproval"("refundApprovalUuid");

-- CreateIndex
CREATE UNIQUE INDEX "Role_roleUuid_key" ON "Role"("roleUuid");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleUuid_permissionUuid_key" ON "RolePermission"("roleUuid", "permissionUuid");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_roleUuid_fkey" FOREIGN KEY ("roleUuid") REFERENCES "Role"("roleUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_ownerUuid_fkey" FOREIGN KEY ("ownerUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerUuid_fkey" FOREIGN KEY ("customerUuid") REFERENCES "Customer"("customerUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_ownerUuid_fkey" FOREIGN KEY ("ownerUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_customerUuid_fkey" FOREIGN KEY ("customerUuid") REFERENCES "Customer"("customerUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_orderUuid_fkey" FOREIGN KEY ("orderUuid") REFERENCES "Order"("orderUuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_ownerUuid_fkey" FOREIGN KEY ("ownerUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_employeeUuid_fkey" FOREIGN KEY ("employeeUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleUuid_fkey" FOREIGN KEY ("roleUuid") REFERENCES "Role"("roleUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionUuid_fkey" FOREIGN KEY ("permissionUuid") REFERENCES "Permission"("permissionUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUuid_fkey" FOREIGN KEY ("actorUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportApproval" ADD CONSTRAINT "ExportApproval_requesterUuid_fkey" FOREIGN KEY ("requesterUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportApproval" ADD CONSTRAINT "ExportApproval_reviewerUuid_fkey" FOREIGN KEY ("reviewerUuid") REFERENCES "Employee"("employeeUuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundApproval" ADD CONSTRAINT "RefundApproval_orderUuid_fkey" FOREIGN KEY ("orderUuid") REFERENCES "Order"("orderUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundApproval" ADD CONSTRAINT "RefundApproval_requesterUuid_fkey" FOREIGN KEY ("requesterUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundApproval" ADD CONSTRAINT "RefundApproval_reviewerUuid_fkey" FOREIGN KEY ("reviewerUuid") REFERENCES "Employee"("employeeUuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderApproval" ADD CONSTRAINT "OrderApproval_orderUuid_fkey" FOREIGN KEY ("orderUuid") REFERENCES "Order"("orderUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderApproval" ADD CONSTRAINT "OrderApproval_requesterUuid_fkey" FOREIGN KEY ("requesterUuid") REFERENCES "Employee"("employeeUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderApproval" ADD CONSTRAINT "OrderApproval_reviewerUuid_fkey" FOREIGN KEY ("reviewerUuid") REFERENCES "Employee"("employeeUuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_actorUuid_fkey" FOREIGN KEY ("actorUuid") REFERENCES "Employee"("employeeUuid") ON DELETE SET NULL ON UPDATE CASCADE;
