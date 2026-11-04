import type { EnvConfig } from '#/config/env.js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MS_PER_SECOND } from '@elo/core/time/time-units';
import { createHmac } from 'node:crypto';

/**
 * Credential a table guest presents to the realtime socket. The socket lives on
 * the API origin, where the session cookie set through the web origin may not
 * reach (another host, a stricter browser), so the session hands the page a
 * signed ticket instead. It is signed with its own key: a staff token is never
 * a ticket and a ticket is never a staff token.
 */
@Injectable()
export class TableTicketService {
    private readonly secret: string;
    private readonly expiresInMs: number;

    constructor(
        private readonly jwt: JwtService,
        configService: ConfigService<EnvConfig, true>
    ) {
        this.secret = createHmac(
            'sha256',
            configService.getOrThrow('jwt.accessTokenSecret', { infer: true })
        )
            .update('table-realtime-ticket')
            .digest('hex');
        this.expiresInMs = configService.getOrThrow('session.tableExpiresInMs', {
            infer: true
        });
    }

    public sign(sessionId: string): string {
        return this.jwt.sign(
            { sid: sessionId },
            {
                secret: this.secret,
                expiresIn: Math.floor(this.expiresInMs / MS_PER_SECOND)
            }
        );
    }

    /** The session the ticket was issued for, or null when it is forged or expired. */
    public async sessionOf(ticket: unknown): Promise<string | null> {
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
