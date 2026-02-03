import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { FollowUpsService } from "./followups.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

type CreateFollowUpInput = {
  customerUuid: string;
  orderUuid?: string;
  followAt: string;
  channel: string;
  request: string;
  result: string;
  nextFollowAt?: string;
  attachment?: string;
};

type UpdateFollowUpInput = {
  followAt?: string;
  channel?: string;
  request?: string;
  result?: string;
  nextFollowAt?: string;
  attachment?: string;
};

@Controller("followups")
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) { }

  @Post("list")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async list(@Req() req: any) {
    return this.followUpsService.findAll(req.user.roleCode, req.user.sub);
  }

  @Post("create")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async create(@Req() req: any, @Body() body: CreateFollowUpInput) {
    return this.followUpsService.create(req.user.roleCode, req.user.sub, body);
  }

  @Post("update")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async update(@Req() req: any, @Body() body: UpdateFollowUpInput & { followUpUuid: string }) {
    return this.followUpsService.update(req.user.roleCode, req.user.sub, body.followUpUuid, body);
  }
}
