import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { Roles } from "./roles.decorator";
import { RolesGuard } from "./roles.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("login")
  async login(@Body() body: { username: string; password: string }) {
    const { username, password } = body;
    return this.authService.login(username, password);
  }

  @Post("dev-token")
  async devToken(
    @Body()
    body: { username?: string; employeeUuid?: string; permanent?: boolean; expiresIn?: string }
  ) {
    return this.authService.createDevToken(body);
  }

  @Post("me")
  @UseGuards(AuthGuard)
  async me(@Req() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @Post("menu")
  @UseGuards(AuthGuard)
  async menu(@Req() req: any) {
    return this.authService.getMenu(req.user.roleCode);
  }

  @Post("admin-check")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  async adminCheck() {
    return { ok: true };
  }
}
