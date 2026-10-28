import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Permission, Role } from '@elo/core';
import type { JwtUser } from './auth-types';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';
export const PERMISSIONS = 'permissions';
export const ALLOW_SUSPENDED = 'allowSuspended';
export const NO_IMPERSONATION = 'noImpersonation';

/** Rota sem JWT (cardápio público, login). Ainda sujeita a validação e rate limit. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
/** Superadmin passa sempre; equipe Elo precisa da permissão. */
export const RequirePermission = (...p: Permission[]) => SetMetadata(PERMISSIONS, p);
/** Rota acessível a funcionário de restaurante mesmo com acesso suspenso (ex.: ver assinatura). */
export const AllowSuspended = () => SetMetadata(ALLOW_SUSPENDED, true);

/** Rota que a equipe Elo não pode usar dentro do painel de um restaurante (credenciais). */
export const NoImpersonation = () => SetMetadata(NO_IMPERSONATION, true);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtUser => ctx.switchToHttp().getRequest().user,
);

/** restaurantId do usuário logado; falha se for equipe Elo. */
export const TenantId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const user: JwtUser = ctx.switchToHttp().getRequest().user;
  if (!user.restaurantId) throw new Error('route requires restaurant user');
  return user.restaurantId;
});
