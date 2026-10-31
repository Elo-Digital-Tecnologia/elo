import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AccessState, hasAnyRole, Role, rolesOf, upgradePermissions } from '@elo/core';
import {
  ALLOW_SUSPENDED,
  IS_PUBLIC,
  NO_IMPERSONATION,
  PERMISSIONS,
  ROLES,
} from '../common/decorators';
import type { JwtUser } from '../common/auth-types';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { StaffService } from '../staff/staff.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly staff: StaffService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]))
      return true;
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<JwtUser & { role?: Role }>(header.slice(7));
      req.user = { ...payload, roles: rolesOf(payload), permissions: upgradePermissions(payload.permissions ?? []) };
    } catch {
      throw new UnauthorizedException();
    }
    // Funcionário desativado perde o acesso mesmo com o JWT ainda válido.
    const user: JwtUser = req.user;
    // Entrada da equipe Elo no restaurante: vale enquanto quem entrou continua ativo.
    const subject = user.impersonatedBy ?? user.sub;
    if (subject === 'superadmin') return true;
    const current = await this.staff.access(subject);
    if (!current) throw new UnauthorizedException();
    // Roles and permissions follow the account, so a change applies without a new sign-in.
    // Elo support keeps the restaurant-admin pass it was given.
    if (!user.impersonatedBy) {
      user.roles = current.roles;
      user.permissions = upgradePermissions(current.permissions);
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

    if (user.impersonatedBy && this.reflector.getAllAndOverride<boolean>(NO_IMPERSONATION, targets)) {
      throw new ForbiddenException('not_allowed_while_impersonating');
    }

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !hasAnyRole(user.roles, roles)) throw new ForbiddenException();

    const needed = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS, targets);
    if (needed && !user.roles.includes(Role.Superadmin)) {
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
    // Elo support may enter a suspended restaurant, but not a deleted one.
    if (user.impersonatedBy) {
      if (await this.restaurants.isDeleted(user.restaurantId)) throw new ForbiddenException('restaurant_deleted');
      return true;
    }
    const state = await this.restaurants.accessStateOf(user.restaurantId);
    if (state === AccessState.Suspended) {
      // The panel says what to do: pay, wait for the Elo team, or sign a new contract.
      const r = await this.restaurants.get(user.restaurantId).catch(() => null);
      const sub = r ? this.restaurants.subscriptionOf(r) : null;
      throw new ForbiddenException({ statusCode: 403, message: 'subscription_suspended', reasons: sub?.reasons ?? [], contractEndsOn: sub?.contract.endsOn ?? null });
    }
    return true;
  }
}
