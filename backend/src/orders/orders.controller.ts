import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

type CreateOrderInput = {
  customerUuid: string;
  amount: number | string;
  payee?: string;
  companyAccountUuid?: string;
  status: string;
  ownerUuid?: string;
  orderedAt: string;
  departureAt?: string;
  route?: string;
  attachment?: string;
  notes?: string;
};

type UpdateOrderInput = {
  customerUuid?: string;
  amount?: number | string;
  payee?: string;
  companyAccountUuid?: string;
  ownerUuid?: string;
  orderedAt?: string;
  departureAt?: string;
  route?: string;
  attachment?: string;
  notes?: string;
};

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post("list")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async list(@Req() req: any) {
    return this.ordersService.findAll(req.user.roleCode, req.user.sub);
  }

  @Post("create")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async create(@Req() req: any, @Body() body: CreateOrderInput) {
    return this.ordersService.create(req.user.roleCode, req.user.sub, body);
  }

  @Post("update")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async update(@Req() req: any, @Body() body: UpdateOrderInput & { orderUuid: string }) {
    return this.ordersService.update(req.user.roleCode, req.user.sub, body.orderUuid, body);
  }

  @Post("update-status")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async updateStatus(
    @Req() req: any,
    @Body() body: { orderUuid: string; status: string; reason: string }
  ) {
    return this.ordersService.updateStatus(
      req.user.roleCode,
      req.user.sub,
      body.orderUuid,
      body.status,
      body.reason
    );
  }
}
