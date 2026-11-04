import type { Role } from '@elo/core/roles/roles';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import type { EnvConfig } from '#/config/env.js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { upgradePermissions } from '@elo/core/roles/permissions';
import { rolesOf } from '@elo/core/roles/roles';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticationRequiredException } from '#/common/exceptions/authentication-required.exception.js';
import { SessionService } from '#/modules/sessions/session.service.js';
import { StaffService } from '#/modules/staff/staff.service.js';
import { SessionEndedException } from '../exceptions/session-ended.exception.js';

export const ACCESS_TOKEN_STRATEGY = 'access-token';

type AccessTokenPayload = JwtUser & { role?: Role };

/**
 * Staff access token. Besides the signature, the token's session must still be alive
 * (signing out, a new password or a long idle period end it) and the account behind it
 * must still be active. Roles and permissions follow the account, so a change applies
 * without a new sign-in; Elo support acting inside a restaurant keeps the pass it got.
 */
@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
    Strategy,
    ACCESS_TOKEN_STRATEGY
) {
    constructor(
        configService: ConfigService<EnvConfig, true>,
        private readonly staffService: StaffService,
        private readonly sessionService: SessionService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.getOrThrow('jwt.accessTokenSecret', {
                infer: true
            }),
            ignoreExpiration: false
        });
    }

    public async validate(payload: AccessTokenPayload): Promise<JwtUser> {
        const user: JwtUser = {
            ...payload,
            roles: rolesOf(payload),
            permissions: upgradePermissions(payload.permissions ?? [])
        };
        if (user.sid && !(await this.sessionService.alive(user.sid)))
            throw new SessionEndedException();

        const subject = user.impersonatedBy ?? user.sub;
        if (subject === 'superadmin') return user;
        const current = await this.staffService.access(subject);
        if (!current) throw new AuthenticationRequiredException();
        if (user.impersonatedBy) return user;
        return {
            ...user,
            roles: current.roles,
            permissions: upgradePermissions(current.permissions)
        };
    }
}
