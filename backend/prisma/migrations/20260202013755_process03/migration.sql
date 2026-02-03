-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "companyAccountUuid" UUID;

-- CreateTable
CREATE TABLE "CompanyAccount" (
    "id" SERIAL NOT NULL,
    "accountUuid" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT,
    "accountNo" TEXT,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAccount_accountUuid_key" ON "CompanyAccount"("accountUuid");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_companyAccountUuid_fkey" FOREIGN KEY ("companyAccountUuid") REFERENCES "CompanyAccount"("accountUuid") ON DELETE SET NULL ON UPDATE CASCADE;
