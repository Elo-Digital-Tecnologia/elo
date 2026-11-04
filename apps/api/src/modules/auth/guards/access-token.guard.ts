import type { ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC } from '#/common/decorators/metadata-keys.js';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';
import { AuthenticationRequiredException } from '#/common/exceptions/authentication-required.exception.js';
import { ACCESS_TOKEN_STRATEGY } from '../strategies/access-token.strategy.js';

/** Requires a valid staff access token, except on routes marked with `@Public()`. */
@Injectable()
export class AccessTokenGuard extends AuthGuard(ACCESS_TOKEN_STRATEGY) {
    constructor(private readonly reflector: Reflector) {
        super();
    }

    public override canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
            context.getHandler(),
            context.getClass()
        ]);
        if (isPublic) return true;
        return super.canActivate(context);
    }

    /** Keeps the specific code (such as `SESSION_ENDED`) instead of a bare 401. */
    public override handleRequest<TUser>(error: unknown, user: TUser | false): TUser {
        if (error instanceof ApiHttpException) throw error;
        if (!user) throw new AuthenticationRequiredException();
        return user;
    }
}
