import { Module } from "@nestjs/common";
import { CompanyAccountsController } from "./company-accounts.controller";
import { CompanyAccountsService } from "./company-accounts.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [CompanyAccountsController],
  providers: [CompanyAccountsService, PrismaService]
})
export class CompanyAccountsModule {}
