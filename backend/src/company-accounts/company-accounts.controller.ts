import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { CompanyAccountsService } from "./company-accounts.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

type CreateCompanyAccountInput = {
  name: string;
  bankName?: string;
  accountNo?: string;
  status?: string;
  notes?: string;
};

type UpdateCompanyAccountStatusInput = {
  accountUuid: string;
  status: string;
};

@Controller("company-accounts")
export class CompanyAccountsController {
  constructor(private readonly companyAccountsService: CompanyAccountsService) { }

  @Post("list")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async list(@Req() req: any) {
    return this.companyAccountsService.findAll(req.user.roleCode, req.user.sub);
  }

  @Post("create")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager")
  async create(@Req() req: any, @Body() body: CreateCompanyAccountInput) {
    return this.companyAccountsService.create(req.user.sub, body);
  }

  @Post("update-status")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager")
  async updateStatus(@Req() req: any, @Body() body: UpdateCompanyAccountStatusInput) {
    return this.companyAccountsService.updateStatus(req.user.sub, body.accountUuid, body.status);
  }
}
