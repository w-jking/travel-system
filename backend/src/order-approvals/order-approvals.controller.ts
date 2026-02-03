import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { OrderApprovalsService } from "./order-approvals.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

type RequestOrderApprovalInput = {
  orderUuid: string;
  comment?: string;
};

type ReviewOrderApprovalInput = {
  orderApprovalUuid: string;
  comment?: string;
};

@Controller("order-approvals")
export class OrderApprovalsController {
  constructor(private readonly orderApprovalsService: OrderApprovalsService) { }

  @Post("list")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff", "data_admin")
  async list(@Req() req: any) {
    return this.orderApprovalsService.list(req.user.roleCode, req.user.sub);
  }

  @Post("request")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async request(@Req() req: any, @Body() body: RequestOrderApprovalInput) {
    return this.orderApprovalsService.request(req.user.sub, body);
  }

  @Post("approve")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager")
  async approve(@Req() req: any, @Body() body: ReviewOrderApprovalInput) {
    return this.orderApprovalsService.approve(req.user.sub, body);
  }

  @Post("reject")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager")
  async reject(@Req() req: any, @Body() body: ReviewOrderApprovalInput) {
    return this.orderApprovalsService.reject(req.user.sub, body);
  }
}
