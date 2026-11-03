import type { Env } from '../config/env';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'node:crypto';

/**
 * Credential a table guest presents to the realtime socket. The socket lives on
 * the API origin, where the session cookie set through the web origin may not
 * reach (another host, a stricter browser), so the session hands the page a
 * signed ticket instead. It is signed with its own key: a staff token is never
 * a ticket and a ticket is never a staff token.
 */
@Injectable()
export class TableTicketsService {
    private readonly secret: string;
    private readonly hours: number;

    constructor(
        private readonly jwt: JwtService,
        config: ConfigService<Env, true>
    ) {
        this.secret = createHmac('sha256', config.get('JWT_SECRET', { infer: true }))
            .update('table-realtime-ticket')
            .digest('hex');
        this.hours = config.get('TABLE_SESSION_HOURS', { infer: true });
    }

    sign(sessionId: string): string {
        return this.jwt.sign(
            { sid: sessionId },
            { secret: this.secret, expiresIn: `${this.hours}h` }
        );
    }

    /** The session the ticket was issued for, or null when it is forged or expired. */
    async sessionOf(ticket: unknown): Promise<string | null> {
        if (typeof ticket !== 'string' || !ticket) return null;
        try {
            const { sid } = await this.jwt.verifyAsync<{ sid?: unknown }>(ticket, {
                secret: this.secret
            });
            return typeof sid === 'string' ? sid : null;
        } catch {
            return null;
        }
    }
}
