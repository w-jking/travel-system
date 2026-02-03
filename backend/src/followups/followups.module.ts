import { Module } from "@nestjs/common";
import { FollowUpsController } from "./followups.controller";
import { FollowUpsService } from "./followups.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [FollowUpsController],
  providers: [FollowUpsService, PrismaService]
})
export class FollowUpsModule {}
