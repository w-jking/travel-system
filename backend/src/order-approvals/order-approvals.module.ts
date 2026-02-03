import { Module } from "@nestjs/common";
import { OrderApprovalsController } from "./order-approvals.controller";
import { OrderApprovalsService } from "./order-approvals.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [OrderApprovalsController],
  providers: [OrderApprovalsService, PrismaService]
})
export class OrderApprovalsModule {}
