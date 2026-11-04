import type { SessionScope } from '@elo/core/sessions/session-scope';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import type { EnvConfig } from '#/config/env.js';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MS_PER_DAY } from '@elo/core/time/time-units';
import { Brackets, IsNull, LessThan, MoreThan, Repository } from 'typeorm';
import { SHORT_CACHE_MS } from '#/common/constants.js';
import { StaffUserEntity } from '#/modules/staff/entities/staff-user.entity.js';
import { StaffSessionEntity } from './entities/staff-session.entity.js';
import {
    CREDENTIAL_TAG_LENGTH,
    SESSION_TOKEN_BYTES,
    USER_AGENT_MAX_LENGTH
} from './session.constants.js';
import { createHash, randomBytes } from 'node:crypto';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/** Who a renewed session belongs to: a team member, or the superadmin (no account). */
export interface RenewedSession {
    id: string;
    scope: string;
    user: StaffUserEntity | null;
}

/**
 * Staff sessions that last across tabs and closed browsers. Each one ends after
 * `SESSION_REFRESH_EXPIRES_IN` without use, on sign-out, or when the password (or the
 * superadmin key) changes, since it is bound to a fingerprint of that credential.
 */
@Injectable()
export class SessionService implements OnApplicationBootstrap, OnApplicationShutdown {
    private readonly log = new Logger(SessionService.name);
    private readonly aliveCache = new Map<string, { alive: boolean; until: number }>();
    private timer?: ReturnType<typeof setInterval>;

    constructor(
        @InjectRepository(StaffSessionEntity)
        private readonly sessions: Repository<StaffSessionEntity>,
        private readonly configService: ConfigService<EnvConfig, true>
    ) {}

    public onApplicationBootstrap() {
        this.timer = setInterval(() => void this.purge(), MS_PER_DAY);
        this.timer.unref();
    }

    public onApplicationShutdown() {
        clearInterval(this.timer);
    }

    /** Fingerprint of a password hash, or of the superadmin key when there is no account. */
    private tagOf(passwordHash: string | null): string {
        return sha256(
            passwordHash ??
                `superadmin:${this.configService.getOrThrow('auth.superadminKey', { infer: true })}`
        ).slice(0, CREDENTIAL_TAG_LENGTH);
    }

    private nextExpiry(now = new Date()) {
        return new Date(
            now.getTime() +
                this.configService.getOrThrow('session.refreshExpiresInMs', {
                    infer: true
                })
        );
    }

    public async open(
        user: StaffUserEntity | null,
        scope: SessionScope,
        userAgent?: string
    ): Promise<{ id: string; token: string; expiresAt: Date }> {
        const token = randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
        const now = new Date();
        const row = await this.sessions.save(
            this.sessions.create({
                userId: user?.id ?? null,
                scope,
                tokenHash: sha256(token),
                credentialTag: this.tagOf(user?.passwordHash ?? null),
                userAgent: userAgent?.slice(0, USER_AGENT_MAX_LENGTH) ?? null,
                lastUsedAt: now,
                expiresAt: this.nextExpiry(now)
            })
        );
        return { id: row.id, token, expiresAt: row.expiresAt };
    }

    /** The live session behind a cookie token, its end pushed forward; null when it is over. */
    public async renew(
        scope: SessionScope,
        token: string
    ): Promise<(RenewedSession & { expiresAt: Date }) | null> {
        const now = new Date();
        const row = await this.sessions.findOne({
            where: {
                tokenHash: sha256(token),
                scope,
                revokedAt: IsNull(),
                expiresAt: MoreThan(now)
            },
            relations: { user: true }
        });
        if (
            !row ||
            row.credentialTag !== this.tagOf(row.user?.passwordHash ?? null) ||
            (row.userId && !row.user)
        )
            return null;
        const expiresAt = this.nextExpiry(now);
        await this.sessions.update({ id: row.id }, { lastUsedAt: now, expiresAt });
        return { id: row.id, scope: row.scope, user: row.user ?? null, expiresAt };
    }

    public async revoke(scope: SessionScope, token: string): Promise<void> {
        const row = await this.sessions.findOne({
            where: { tokenHash: sha256(token), scope, revokedAt: IsNull() }
        });
        if (!row) return;
        await this.sessions.update({ id: row.id }, { revokedAt: new Date() });
        this.aliveCache.delete(row.id);
    }

    /** Whether the session an access token came from still holds (cached for a few seconds). */
    public async alive(id: string): Promise<boolean> {
        const hit = this.aliveCache.get(id);
        if (hit && hit.until > Date.now()) return hit.alive;
        const row = await this.sessions
            .findOne({ where: { id }, relations: { user: true } })
            .catch(() => null);
        const alive =
            !!row &&
            !row.revokedAt &&
            row.expiresAt.getTime() > Date.now() &&
            !(row.userId && !row.user) &&
            row.credentialTag === this.tagOf(row.user?.passwordHash ?? null);
        this.aliveCache.set(id, { alive, until: Date.now() + SHORT_CACHE_MS });
        return alive;
    }

    /** The member changed their own password: this session stays, every other one ends. */
    public async keepAfterPasswordChange(
        id: string | undefined,
        passwordHash: string
    ): Promise<void> {
        this.aliveCache.clear();
        if (id)
            await this.sessions.update(
                { id },
                { credentialTag: this.tagOf(passwordHash) }
            );
    }

    /** Erases sessions that ended (expired or signed out) more than a day ago. */
    public async purge(now = new Date()): Promise<number> {
        const cutoff = new Date(now.getTime() - MS_PER_DAY);
        try {
            const { affected } = await this.sessions
                .createQueryBuilder()
                .delete()
                .where(
                    new Brackets((w) =>
                        w
                            .where({ expiresAt: LessThan(cutoff) })
                            .orWhere({ revokedAt: LessThan(cutoff) })
                    )
                )
                .execute();
            return affected ?? 0;
        } catch (e) {
            this.log.error('Session cleanup failed', e as Error);
            return 0;
        }
    }
}
