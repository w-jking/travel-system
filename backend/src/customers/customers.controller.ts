import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

type CreateCustomerInput = {
  name: string;
  contact: string;
  level: string;
  ownerUuid?: string;
  idNumber?: string;
  birthDate?: string;
  preferences?: string;
  notes?: string;
};

type UpdateCustomerInput = {
  name?: string;
  contact?: string;
  level?: string;
  ownerUuid?: string;
  idNumber?: string;
  birthDate?: string;
  preferences?: string;
  notes?: string;
};

type RegradeInput = {
  months?: number;
  amountThreshold?: number | string;
  tripsThreshold?: number;
  customerUuid?: string;
};

type ImportCustomersInput = {
  rows: CreateCustomerInput[];
};

type ExportCustomersInput = {
  exportApprovalUuid: string;
};

type ReportCustomerValueInput = {
  from?: string;
  to?: string;
  customerUuid?: string;
  ownerUuid?: string;
  customerUuids?: string[];
  ownerUuids?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) { }

  @Post("list")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async list(@Req() req: any) {
    return this.customersService.findAll(req.user.roleCode, req.user.sub);
  }

  @Post("create")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async create(@Req() req: any, @Body() body: CreateCustomerInput) {
    return this.customersService.create(req.user.roleCode, req.user.sub, body);
  }

  @Post("update")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async update(@Req() req: any, @Body() body: UpdateCustomerInput & { customerUuid: string }) {
    return this.customersService.update(req.user.roleCode, req.user.sub, body.customerUuid, body);
  }

  @Post("regrade")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async regrade(@Req() req: any, @Body() body: RegradeInput) {
    return this.customersService.regrade(req.user.roleCode, req.user.sub, body);
  }

  @Post("import")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async import(@Req() req: any, @Body() body: ImportCustomersInput) {
    return this.customersService.import(req.user.roleCode, req.user.sub, body);
  }

  @Post("export")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff", "data_admin")
  async export(@Req() req: any, @Body() body: ExportCustomersInput) {
    return this.customersService.export(req.user.roleCode, req.user.sub, body);
  }

  @Post("report-value")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async reportValue(@Req() req: any, @Body() body: ReportCustomerValueInput) {
    return this.customersService.reportValue(req.user.roleCode, req.user.sub, body);
  }
}
