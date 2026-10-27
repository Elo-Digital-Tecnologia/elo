import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AccessState, Role } from '@elo/core';
import {
  ALLOW_SUSPENDED,
  IS_PUBLIC,
  PERMISSIONS,
  ROLES,
} from '../common/decorators';
import type { JwtUser } from '../common/auth-types';
import { RestaurantsService } from '../restaurants/restaurants.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]))
      return true;
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();
    try {
      req.user = await this.jwt.verifyAsync<JwtUser>(header.slice(7));
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    const user: JwtUser = ctx.switchToHttp().getRequest().user;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !roles.includes(user.role)) throw new ForbiddenException();

    const needed = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS, targets);
    if (needed && user.role !== Role.Superadmin) {
      if (!needed.every((p) => user.permissions.includes(p))) throw new ForbiddenException();
    }
    return true;
  }
}

/** Bloqueia funcionários de restaurante quando a assinatura está suspensa. */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly restaurants: RestaurantsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    if (this.reflector.getAllAndOverride<boolean>(ALLOW_SUSPENDED, targets)) return true;
    const user: JwtUser = ctx.switchToHttp().getRequest().user;
    if (!user.restaurantId) return true;
    const state = await this.restaurants.accessStateOf(user.restaurantId);
    if (state === AccessState.Suspended) throw new ForbiddenException('subscription_suspended');
    return true;
  }
}
