import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PrismaService } from "../prisma.service";
import { AlertsService } from "../alerts/alerts.service";

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService, AlertsService]
})
export class OrdersModule { }
