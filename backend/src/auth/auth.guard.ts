import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { AuthPayload } from "./auth.types";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers["authorization"] as string | undefined;
    if (!auth) {
      throw new UnauthorizedException("missing token");
    }
    const token = auth.replace("Bearer ", "");
    const secret = process.env.JWT_SECRET || "dev_secret";
    try {
      const payload = jwt.verify(token, secret) as AuthPayload;
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("invalid token");
    }
  }
}
