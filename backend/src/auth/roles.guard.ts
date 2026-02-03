import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.get<string[]>("roles", context.getHandler()) || [];
    if (roles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const roleCode = request.user?.roleCode;
    if (!roleCode) {
      return false;
    }
    return roles.includes(roleCode);
  }
}
