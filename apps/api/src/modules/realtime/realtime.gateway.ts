import type { Server, Socket } from 'socket.io';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
    OnGatewayConnection,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets';
import { AccessState } from '@elo/core/subscription/subscription';
import { Repository } from 'typeorm';
import { TABLE_SESSION_COOKIE_NAME, UUID_PATTERN } from '#/common/constants.js';
import { RestaurantService } from '#/modules/restaurants/restaurant.service.js';
import { SessionService } from '#/modules/sessions/session.service.js';
import { StaffService } from '#/modules/staff/staff.service.js';
import { TableSessionEntity } from '#/modules/tables/entities/table-session.entity.js';
import { SOCKET_PING_INTERVAL_MS, SOCKET_PING_TIMEOUT_MS } from './realtime.constants.js';
import { RealtimeService, memberRoom, staffRoom, tableRoom } from './realtime.service.js';
import { TableTicketService } from './table-ticket.service.js';

function parseCookie(header: string | undefined, name: string): string | undefined {
    return header
        ?.split(';')
        .map((c) => c.trim().split('='))
        .find(([k]) => k === name)?.[1];
}

/** Sent before the server drops a connection, so the client stops retrying and says why. */
type AuthError = 'expired' | 'invalid' | 'suspended' | 'session';

@WebSocketGateway({
    // Phones freeze pages for a while when locked; a longer timeout keeps short freezes from dropping the socket.
    pingInterval: SOCKET_PING_INTERVAL_MS,
    pingTimeout: SOCKET_PING_TIMEOUT_MS
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
    @WebSocketServer() public server: Server;

    constructor(
        private readonly realtime: RealtimeService,
        private readonly jwt: JwtService,
        private readonly restaurants: RestaurantService,
        private readonly staff: StaffService,
        @InjectRepository(TableSessionEntity)
        private readonly sessions: Repository<TableSessionEntity>,
        private readonly staffSessions: SessionService,
        private readonly tickets: TableTicketService
    ) {}

    public afterInit(server: Server) {
        this.realtime.attach(server);
    }

    /**
     * Staff: JWT in `auth.token`. Table guest: the session ticket in `auth.ticket`,
     * or the session cookie when the page and the API share a host. Without a
     * valid credential the connection drops. `ready` follows the room join: events
     * before it may have been missed, so the client reloads its screen on it.
     */
    public async handleConnection(client: Socket) {
        const reject = (reason: AuthError) => {
            client.emit('auth_error', reason);
            client.disconnect(true);
        };
        const token = client.handshake.auth?.['token'] as string | undefined;
        if (token) {
            let user: JwtUser;
            try {
                user = await this.jwt.verifyAsync<JwtUser>(token);
            } catch (e) {
                return reject(
                    (e as Error).name === 'TokenExpiredError' ? 'expired' : 'invalid'
                );
            }
            if (!user.restaurantId) return reject('invalid');
            if (user.sid && !(await this.staffSessions.alive(user.sid)))
                return reject('expired');
            const state = await this.restaurants
                .accessStateOf(user.restaurantId)
                .catch(() => null);
            if (!state) return reject('invalid');
            if (state === AccessState.SUSPENDED) return reject('suspended');
            // A deactivated or archived member keeps a valid token for hours; the live feed stops at once.
            if (
                !user.impersonatedBy &&
                !(await this.staff.access(user.sub).catch(() => null))
            )
                return reject('invalid');
            await client.join([staffRoom(user.restaurantId), memberRoom(user.sub)]);
            client.emit('ready');
            return;
        }
        const sessionId =
            (await this.tickets.sessionOf(client.handshake.auth?.['ticket'])) ??
            parseCookie(client.handshake.headers.cookie, TABLE_SESSION_COOKIE_NAME);
        const session =
            sessionId && UUID_PATTERN.test(sessionId)
                ? await this.sessions
                      .findOne({ where: { id: sessionId } })
                      .catch(() => null)
                : null;
        if (!session || session.closedAt || session.expiresAt.getTime() < Date.now())
            return reject('session');
        await client.join(tableRoom(session.tableId));
        client.emit('ready');
    }

    /** Answers the client's liveness check: a socket that cannot answer is dead even if it looks connected. */
    @SubscribeMessage('alive')
    public alive() {
        return true;
    }
}
