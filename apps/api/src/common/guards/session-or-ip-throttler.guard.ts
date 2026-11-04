import type { ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
    InjectThrottlerOptions,
    InjectThrottlerStorage,
    ThrottlerGuard
} from '@nestjs/throttler';
import { TABLE_SESSION_COOKIE_NAME, UUID_PATTERN } from '#/common/constants.js';

const IP_ONLY_PATHS = [/\/auth\//, /\/public\/[^/]+\/[^/]+\/session$/];

interface ThrottledRequest {
    headers?: Record<string, string | undefined>;
    cookies?: Record<string, string | undefined>;
    url?: string;
    ip?: string;
}

/**
 * Rate limit bucket: the staff member (verified JWT), else the table session, else the IP.
 * It runs before the access token guard, so the token is verified here: a forged token
 * falls into the IP bucket and never spends someone else's limit. Sign-in and starting
 * a table session never trust the cookie, since a made-up value would open a fresh
 * bucket on every request.
 */
@Injectable()
export class SessionOrIpThrottlerGuard extends ThrottlerGuard {
    constructor(
        @InjectThrottlerOptions() options: ThrottlerModuleOptions,
        @InjectThrottlerStorage() storage: ThrottlerStorage,
        reflector: Reflector,
        private readonly jwtService: JwtService
    ) {
        super(options, storage, reflector);
    }

    protected override async getTracker(req: ThrottledRequest): Promise<string> {
        const header = req.headers?.['authorization'];
        if (header?.startsWith('Bearer ')) {
            try {
                const { sub } = this.jwtService.verify<{ sub: string }>(header.slice(7));
                if (sub) return `u:${sub}`;
            } catch {
                // An invalid token falls through to the other buckets.
            }
        }
        const path = String(req.url ?? '').split('?')[0] ?? '';
        if (IP_ONLY_PATHS.some((pattern) => pattern.test(path))) return `ip:${req.ip}`;
        const session = req.cookies?.[TABLE_SESSION_COOKIE_NAME];
        return session && UUID_PATTERN.test(session) ? `s:${session}` : `ip:${req.ip}`;
    }
}
