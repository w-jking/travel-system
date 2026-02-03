import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { AuditLogsService } from "./audit-logs.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

type ListAuditLogInput = {
  actorUuid?: string;
  targetType?: string;
  targetUuid?: string;
  action?: string;
  from?: string;
  to?: string;
  keyword?: string;
};

@Controller("audit")
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) { }

  @Post("list")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "data_admin", "staff")
  async list(@Req() req: any, @Body() body: ListAuditLogInput) {
    return this.auditLogsService.findAll(req.user.roleCode, req.user.sub, body);
  }
}
