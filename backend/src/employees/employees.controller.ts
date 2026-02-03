import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { EmployeesService } from "./employees.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

type EmployeeInput = {
  name: string;
  phone: string;
  department: string;
  position: string;
  roleCode: string;
  status: string;
  email?: string;
  hiredAt?: string;
  employeeNo?: string;
};

type ImportEmployeesInput = {
  rows: EmployeeInput[];
};

type ExportEmployeesInput = {
  exportApprovalUuid: string;
};

type ReportEmployeePerformanceInput = {
  from?: string;
  to?: string;
  employeeUuid?: string;
  employeeUuids?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

@Controller("employees")
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) { }

  @Post("list")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager")
  async list(@Req() req: any) {
    return this.employeesService.findAll(req.user.roleCode, req.user.sub);
  }

  @Post("create")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  async create(@Req() req: any, @Body() body: EmployeeInput) {
    return this.employeesService.create(req.user.sub, body);
  }

  @Post("update")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  async update(@Req() req: any, @Body() body: Partial<EmployeeInput> & { employeeUuid: string }) {
    return this.employeesService.update(req.user.sub, body.employeeUuid, body);
  }

  @Post("update-status")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  async updateStatus(
    @Req() req: any,
    @Body() body: { employeeUuid: string; status: string }
  ) {
    return this.employeesService.updateStatus(req.user.sub, body.employeeUuid, body.status);
  }

  @Post("import")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  async import(@Req() req: any, @Body() body: ImportEmployeesInput) {
    return this.employeesService.import(req.user.sub, body);
  }

  @Post("export")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff", "data_admin")
  async export(@Req() req: any, @Body() body: ExportEmployeesInput) {
    return this.employeesService.export(req.user.roleCode, req.user.sub, body);
  }

  @Post("report-performance")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "manager", "staff")
  async reportPerformance(@Req() req: any, @Body() body: ReportEmployeePerformanceInput) {
    return this.employeesService.reportPerformance(req.user.roleCode, req.user.sub, body);
  }
}
