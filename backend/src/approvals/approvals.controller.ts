import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApprovalsService } from "./approvals.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

type RequestRefundInput = {
  orderUuid: string;
  comment?: string;
};

type ReviewRefundInput = {
  refundApprovalUuid: string;
  comment?: string;
};

type RequestExportInput = {
  scope: string;
  comment?: string;
};

type ReviewExportInput = {
  exportApprovalUuid: string;
  comment?: string;
};


@Controller()
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) { }

  @Post("refund-approvals/list")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff", "data_admin")
  async listRefunds(@Req() req: any) {
    return this.approvalsService.listRefunds(req.user.roleCode, req.user.sub);
  }

  @Post("refund-approvals/request")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async requestRefund(@Req() req: any, @Body() body: RequestRefundInput) {
    return this.approvalsService.requestRefund(req.user.roleCode, req.user.sub, body);
  }

  @Post("refund-approvals/approve")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager")
  async approveRefund(@Req() req: any, @Body() body: ReviewRefundInput) {
    return this.approvalsService.approveRefund(req.user.sub, body);
  }

  @Post("refund-approvals/reject")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager")
  async rejectRefund(@Req() req: any, @Body() body: ReviewRefundInput) {
    return this.approvalsService.rejectRefund(req.user.sub, body);
  }

  @Post("export-approvals/list")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff", "data_admin")
  async listExports(@Req() req: any) {
    return this.approvalsService.listExports(req.user.roleCode, req.user.sub);
  }

  @Post("export-approvals/request")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async requestExport(@Req() req: any, @Body() body: RequestExportInput) {
    return this.approvalsService.requestExport(req.user.sub, body);
  }

  @Post("export-approvals/approve")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "data_admin")
  async approveExport(@Req() req: any, @Body() body: ReviewExportInput) {
    return this.approvalsService.approveExport(req.user.sub, body);
  }

  @Post("export-approvals/reject")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "data_admin")
  async rejectExport(@Req() req: any, @Body() body: ReviewExportInput) {
    return this.approvalsService.rejectExport(req.user.sub, body);
  }

}
