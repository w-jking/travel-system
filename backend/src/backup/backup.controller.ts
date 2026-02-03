import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { BackupService } from "./backup.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

type RunBackupInput = {
  note?: string;
};

type RestoreBackupInput = {
  backupId?: string;
  at?: string;
  dryRun?: boolean;
};

@Controller("backup")
export class BackupController {
  constructor(private readonly backupService: BackupService) { }

  @Post("list")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "data_admin")
  async list() {
    return this.backupService.list();
  }

  @Post("run")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "data_admin")
  async run(@Req() req: any, @Body() body: RunBackupInput) {
    return this.backupService.run(req.user.sub, body);
  }

  @Post("restore")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  async restore(@Req() req: any, @Body() body: RestoreBackupInput) {
    return this.backupService.restore(req.user.sub, body);
  }
}
