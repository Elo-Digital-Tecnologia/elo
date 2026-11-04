import type { SessionScope } from '@elo/core/sessions/session-scope';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import type { EnvConfig } from '#/config/env.js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ALL_PERMISSIONS } from '@elo/core/roles/permissions';
import { EloStaffRoles, Role, hasAnyRole } from '@elo/core/roles/roles';
import { restaurantScope } from '@elo/core/sessions/session-scope';
import bcrypt from 'bcryptjs';
import { IsNull, Repository } from 'typeorm';
import { SUPERADMIN_NAME } from '#/common/constants.js';
import { RestaurantSlugAliasEntity } from '#/modules/restaurants/entities/restaurant-slug-alias.entity.js';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { restaurantBySlug } from '#/modules/restaurants/utils/restaurant-slug.js';
import { SessionService } from '#/modules/sessions/session.service.js';
import { StaffUserEntity } from '#/modules/staff/entities/staff-user.entity.js';
import { InvalidCredentialsException } from './exceptions/invalid-credentials.exception.js';
import { SessionEndedException } from './exceptions/session-ended.exception.js';
import { timingSafeEqual } from 'node:crypto';

/** A short access token plus the long session behind it, kept by the browser in a cookie. */
export interface SignedIn {
    accessToken: string;
    session: { scope: SessionScope; token: string; expiresAt: Date };
}

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(StaffUserEntity)
        private readonly users: Repository<StaffUserEntity>,
        @InjectRepository(RestaurantEntity)
        private readonly restaurants: Repository<RestaurantEntity>,
        private readonly jwt: JwtService,
        private readonly configService: ConfigService<EnvConfig, true>,
        private readonly sessions: SessionService
    ) {
        this.dummyHash = bcrypt.hashSync(
            'not-a-real-password',
            configService.getOrThrow('app.passwordHashCost', { infer: true })
        );
    }

    /** Hash compared when the user does not exist, so the answer takes as long as a real check. */
    private readonly dummyHash: string;

    /** Sign-in of a restaurant team: the user only counts inside the restaurant of the address. */
    public async restaurantLogin(
        slug: string,
        username: string,
        password: string,
        userAgent?: string
    ): Promise<SignedIn> {
        const restaurant = await restaurantBySlug(this.restaurants.manager, slug);
        const user = restaurant
            ? await this.users.findOne({
                  where: { username, restaurantId: restaurant.id, deletedAt: IsNull() }
              })
            : null;
        return this.check(
            user,
            password,
            (u) => !hasAnyRole(u.roles, EloStaffRoles),
            restaurantScope(restaurant?.slug ?? slug),
            userAgent
        );
    }

    /** Sign-in of the Elo Digital team (no restaurant). */
    public async teamLogin(
        username: string,
        password: string,
        userAgent?: string
    ): Promise<SignedIn> {
        const user = await this.users.findOne({
            where: { username, restaurantId: IsNull(), deletedAt: IsNull() }
        });
        return this.check(
            user,
            password,
            (u) => hasAnyRole(u.roles, EloStaffRoles),
            'admin',
            userAgent
        );
    }

    /** Same answer and same hashing cost for an unknown user or restaurant, a wrong password and an inactive account. */
    private async check(
        user: StaffUserEntity | null,
        password: string,
        roleOk: (u: StaffUserEntity) => boolean,
        scope: SessionScope,
        userAgent?: string
    ): Promise<SignedIn> {
        const ok = await bcrypt.compare(password, user?.passwordHash ?? this.dummyHash);
        if (!user || !ok || !user.active || !roleOk(user))
            throw new InvalidCredentialsException();
        const session = await this.sessions.open(user, scope, userAgent);
        return {
            accessToken: await this.sign(this.payloadOf(user, session.id)),
            session: { scope, token: session.token, expiresAt: session.expiresAt }
        };
    }

    /** The superadmin signs in with the generated key, kept only in an environment variable. */
    public async superadminLogin(key: string, userAgent?: string): Promise<SignedIn> {
        const expected = Buffer.from(
            this.configService.getOrThrow('auth.superadminKey', { infer: true })
        );
        const given = Buffer.from(key);
        if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
            throw new InvalidCredentialsException();
        }
        const session = await this.sessions.open(null, 'admin', userAgent);
        return {
            accessToken: await this.sign(this.superadmin(session.id)),
            session: {
                scope: 'admin',
                token: session.token,
                expiresAt: session.expiresAt
            }
        };
    }

    /**
     * A fresh access token from the session cookie, with the account's current roles,
     * permissions and name. Refused when the session ended, the account was turned off
     * or the account does not belong to the panel asking.
     */
    public async renew(
        scope: SessionScope,
        token: string | undefined
    ): Promise<SignedIn> {
        const session = token ? await this.sessions.renew(scope, token) : null;
        if (!session) throw new SessionEndedException();
        const user = session.user;
        if (!user) {
            if (scope !== 'admin') throw new SessionEndedException();
            return {
                accessToken: await this.sign(this.superadmin(session.id)),
                session: { scope, token: token!, expiresAt: session.expiresAt }
            };
        }
        if (!user.active || user.deletedAt || !(await this.belongs(user, scope))) {
            await this.sessions.revoke(scope, token!);
            throw new SessionEndedException();
        }
        return {
            accessToken: await this.sign(this.payloadOf(user, session.id)),
            session: { scope, token: token!, expiresAt: session.expiresAt }
        };
    }

    /**
     * The scope under the restaurant's current link, and the ones of its old links: a
     * device signed in before the link changed still has its cookie under an old name.
     */
    public async scopesOf(
        scope: SessionScope
    ): Promise<{ current: SessionScope; old: SessionScope[] }> {
        if (scope === 'admin') return { current: scope, old: [] };
        const r = await restaurantBySlug(this.restaurants.manager, scope.slice(2));
        if (!r) return { current: scope, old: [] };
        const rows = await this.restaurants.manager.find(RestaurantSlugAliasEntity, {
            where: { restaurantId: r.id }
        });
        return {
            current: restaurantScope(r.slug),
            old: rows.map((a) => restaurantScope(a.slug))
        };
    }

    public async logout(scope: SessionScope, token: string | undefined): Promise<void> {
        if (token) await this.sessions.revoke(scope, token);
    }

    private async belongs(user: StaffUserEntity, scope: SessionScope): Promise<boolean> {
        if (scope === 'admin')
            return !user.restaurantId && hasAnyRole(user.roles, EloStaffRoles);
        if (!user.restaurantId || hasAnyRole(user.roles, EloStaffRoles)) return false;
        return (
            (await restaurantBySlug(this.restaurants.manager, scope.slice(2)))?.id ===
            user.restaurantId
        );
    }

    private payloadOf(user: StaffUserEntity, sid: string): JwtUser {
        return {
            sub: user.id,
            roles: user.roles,
            name: user.name,
            restaurantId: user.restaurantId,
            permissions: user.permissions,
            sid
        };
    }

    private superadmin(sid: string): JwtUser {
        return {
            sub: 'superadmin',
            roles: [Role.SUPERADMIN],
            name: SUPERADMIN_NAME,
            restaurantId: null,
            permissions: ALL_PERMISSIONS,
            sid
        };
    }

    private sign(payload: JwtUser) {
        return this.jwt.signAsync(payload);
    }
}
