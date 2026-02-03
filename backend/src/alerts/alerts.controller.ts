import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { AlertsService } from "./alerts.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

type ScanAlertInput = {
  days?: number;
};

type ListAlertInput = {
  ruleCode?: string;
  status?: string;
  actorUuid?: string;
  from?: string;
  to?: string;
};

type ResolveAlertInput = {
  alertUuid: string;
};

@Controller("alerts")
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) { }

  @Post("list")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "data_admin", "staff")
  async list(@Req() req: any, @Body() body: ListAlertInput) {
    return this.alertsService.list(req.user.roleCode, req.user.sub, body);
  }

  @Post("scan")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager")
  async scan(@Req() req: any, @Body() body: ScanAlertInput) {
    return this.alertsService.scan(req.user.sub, body);
  }

  @Post("resolve")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "data_admin")
  async resolve(@Req() req: any, @Body() body: ResolveAlertInput) {
    return this.alertsService.resolve(req.user.sub, body);
  }
}
