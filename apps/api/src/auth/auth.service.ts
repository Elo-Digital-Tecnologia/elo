import type { SessionScope } from '@elo/core';
import type { JwtUser } from '../common/auth-types';
import type { Env } from '../config/env';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
    ALL_PERMISSIONS,
    EloStaffRoles,
    Role,
    SESSION_RULES,
    hasAnyRole,
    restaurantScope
} from '@elo/core';
import * as bcrypt from 'bcryptjs';
import { IsNull, Repository } from 'typeorm';
import { Restaurant, RestaurantSlugAlias, StaffUser } from '../database/entities';
import { restaurantBySlug } from '../restaurants/slugs';
import { SessionsService } from '../sessions/sessions.service';
import { timingSafeEqual } from 'crypto';

/** Dummy para igualar tempo de resposta quando o usuário não existe. */
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

/** A short access token plus the long session behind it, kept by the browser in a cookie. */
export interface SignedIn {
    accessToken: string;
    session: { scope: SessionScope; token: string; expiresAt: Date };
}

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(StaffUser) private readonly users: Repository<StaffUser>,
        @InjectRepository(Restaurant)
        private readonly restaurants: Repository<Restaurant>,
        private readonly jwt: JwtService,
        private readonly config: ConfigService<Env, true>,
        private readonly sessions: SessionsService
    ) {}

    /** Login da equipe de um restaurante: o usuário só vale dentro do restaurante do endereço. */
    async restaurantLogin(
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

    /** Login da equipe Elo Digital (sem restaurante). */
    async teamLogin(
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

    /** Mesma resposta e mesmo custo de hash para usuário ou restaurante inexistente, senha errada e conta inativa. */
    private async check(
        user: StaffUser | null,
        password: string,
        roleOk: (u: StaffUser) => boolean,
        scope: SessionScope,
        userAgent?: string
    ): Promise<SignedIn> {
        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !ok || !user.active || !roleOk(user))
            throw new UnauthorizedException('invalid_credentials');
        const session = await this.sessions.open(user, scope, userAgent);
        return {
            accessToken: await this.sign(this.payloadOf(user, session.id)),
            session: { scope, token: session.token, expiresAt: session.expiresAt }
        };
    }

    /** Superadmin entra com a chave gerada, guardada só em variável de ambiente. */
    async superadminLogin(key: string, userAgent?: string): Promise<SignedIn> {
        const expected = Buffer.from(this.config.get('SUPERADMIN_KEY', { infer: true }));
        const given = Buffer.from(key);
        if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
            throw new UnauthorizedException('invalid_credentials');
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
    async renew(scope: SessionScope, token: string | undefined): Promise<SignedIn> {
        const session = token ? await this.sessions.renew(scope, token) : null;
        if (!session) throw new UnauthorizedException('session_ended');
        const user = session.user;
        if (!user) {
            if (scope !== 'admin') throw new UnauthorizedException('session_ended');
            return {
                accessToken: await this.sign(this.superadmin(session.id)),
                session: { scope, token: token!, expiresAt: session.expiresAt }
            };
        }
        if (!user.active || user.deletedAt || !(await this.belongs(user, scope))) {
            await this.sessions.revoke(scope, token!);
            throw new UnauthorizedException('session_ended');
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
    async scopesOf(
        scope: SessionScope
    ): Promise<{ current: SessionScope; old: SessionScope[] }> {
        if (scope === 'admin') return { current: scope, old: [] };
        const r = await restaurantBySlug(this.restaurants.manager, scope.slice(2));
        if (!r) return { current: scope, old: [] };
        const rows = await this.restaurants.manager.find(RestaurantSlugAlias, {
            where: { restaurantId: r.id }
        });
        return {
            current: restaurantScope(r.slug),
            old: rows.map((a) => restaurantScope(a.slug))
        };
    }

    async logout(scope: SessionScope, token: string | undefined): Promise<void> {
        if (token) await this.sessions.revoke(scope, token);
    }

    private async belongs(user: StaffUser, scope: SessionScope): Promise<boolean> {
        if (scope === 'admin')
            return !user.restaurantId && hasAnyRole(user.roles, EloStaffRoles);
        if (!user.restaurantId || hasAnyRole(user.roles, EloStaffRoles)) return false;
        return (
            (await restaurantBySlug(this.restaurants.manager, scope.slice(2)))?.id ===
            user.restaurantId
        );
    }

    private payloadOf(user: StaffUser, sid: string): JwtUser {
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
            roles: [Role.Superadmin],
            name: 'Superadmin',
            restaurantId: null,
            permissions: ALL_PERMISSIONS,
            sid
        };
    }

    private sign(payload: JwtUser) {
        return this.jwt.signAsync(payload, {
            expiresIn: SESSION_RULES.accessTokenMinutes * 60
        });
    }
}
