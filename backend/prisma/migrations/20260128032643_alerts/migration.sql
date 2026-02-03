-- DropForeignKey
ALTER TABLE "ExportApproval" DROP CONSTRAINT "ExportApproval_reviewerUuid_fkey";

-- DropForeignKey
ALTER TABLE "RefundApproval" DROP CONSTRAINT "RefundApproval_reviewerUuid_fkey";

-- AlterTable
ALTER TABLE "ExportApproval" ALTER COLUMN "reviewerUuid" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RefundApproval" ALTER COLUMN "reviewerUuid" DROP NOT NULL;

-- CreateTable
CREATE TABLE "OrderApproval" (
    "orderApprovalUuid" UUID NOT NULL,
    "orderUuid" UUID NOT NULL,
    "requesterUuid" UUID NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "reviewerUuid" UUID,
    "reviewedAt" TIMESTAMP(3),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderApproval_pkey" PRIMARY KEY ("orderApprovalUuid")
);

-- CreateTable
CREATE TABLE "Alert" (
    "alertUuid" UUID NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actorUuid" UUID,
    "targetType" TEXT,
    "targetUuid" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("alertUuid")
);

-- AddForeignKey
ALTER TABLE "ExportApproval" ADD CONSTRAINT "ExportApproval_reviewerUuid_fkey" FOREIGN KEY ("reviewerUuid") REFERENCES "Employee"("employeeUuid") ON DELETE SET NULL ON UPDATE CASCADE;

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
