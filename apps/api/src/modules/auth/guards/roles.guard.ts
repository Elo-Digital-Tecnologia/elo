import type { JwtUser } from '#/common/types/jwt-user.type.js';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, hasAnyRole } from '@elo/core/roles/roles';
import {
    IS_PUBLIC,
    NO_IMPERSONATION,
    PERMISSIONS,
    ROLES
} from '#/common/decorators/metadata-keys.js';
import { AccessDeniedException } from '#/common/exceptions/access-denied.exception.js';
import { NotAllowedWhileImpersonatingException } from '../exceptions/not-allowed-while-impersonating.exception.js';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    public canActivate(ctx: ExecutionContext): boolean {
        const targets = [ctx.getHandler(), ctx.getClass()];
        if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
        const user: JwtUser = ctx.switchToHttp().getRequest().user;

        if (
            user.impersonatedBy &&
            this.reflector.getAllAndOverride<boolean>(NO_IMPERSONATION, targets)
        ) {
            throw new NotAllowedWhileImpersonatingException();
        }

        const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
            ROLES,
            targets
        );
        if (roles && !hasAnyRole(user.roles, roles)) throw new AccessDeniedException();

        const needed = this.reflector.getAllAndOverride<string[] | undefined>(
            PERMISSIONS,
            targets
        );
        if (needed && !user.roles.includes(Role.SUPERADMIN)) {
            if (!needed.every((p) => user.permissions.includes(p)))
                throw new AccessDeniedException();
        }
        return true;
    }
}
