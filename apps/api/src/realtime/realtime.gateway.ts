import { OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { AccessState } from '@elo/core';
import { corsOrigin } from '../config/cors';
import { TableSession } from '../database/entities';
import type { JwtUser } from '../common/auth-types';
import { SessionsService } from '../sessions/sessions.service';
import { StaffService } from '../staff/staff.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { RealtimeService, staffRoom, tableRoom, memberRoom } from './realtime.service';
import { TableTicketsService } from './table-tickets.service';

export const TABLE_COOKIE = 'elo_table';

function parseCookie(header: string | undefined, name: string): string | undefined {
  return header
    ?.split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === name)?.[1];
}

/** Sent before the server drops a connection, so the client stops retrying and says why. */
type AuthError = 'expired' | 'invalid' | 'suspended' | 'session';

@WebSocketGateway({
  cors: { origin: corsOrigin, credentials: true },
  // Phones freeze pages for a while when locked; a longer timeout keeps short freezes from dropping the socket.
  pingInterval: 25_000,
  pingTimeout: 60_000,
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private readonly realtime: RealtimeService,
    private readonly jwt: JwtService,
    private readonly restaurants: RestaurantsService,
    private readonly staff: StaffService,
    @InjectRepository(TableSession) private readonly sessions: Repository<TableSession>,
    private readonly staffSessions: SessionsService,
    private readonly tickets: TableTicketsService,
  ) {}

  afterInit(server: Server) {
    this.realtime.attach(server);
  }

  /**
   * Staff: JWT in `auth.token`. Table guest: the session ticket in `auth.ticket`,
   * or the session cookie when the page and the API share a host. Without a
   * valid credential the connection drops. `ready` follows the room join: events
   * before it may have been missed, so the client reloads its screen on it.
   */
  async handleConnection(client: Socket) {
    const reject = (reason: AuthError) => {
      client.emit('auth_error', reason);
      client.disconnect(true);
    };
    const token = client.handshake.auth?.token as string | undefined;
    if (token) {
      let user: JwtUser;
      try {
        user = await this.jwt.verifyAsync<JwtUser>(token);
      } catch (e) {
        return reject((e as Error).name === 'TokenExpiredError' ? 'expired' : 'invalid');
      }
      if (!user.restaurantId) return reject('invalid');
      if (user.sid && !(await this.staffSessions.alive(user.sid))) return reject('expired');
      const state = await this.restaurants.accessStateOf(user.restaurantId).catch(() => null);
      if (!state) return reject('invalid');
      if (state === AccessState.Suspended) return reject('suspended');
      // A deactivated or archived member keeps a valid token for hours; the live feed stops at once.
      if (!user.impersonatedBy && !(await this.staff.access(user.sub).catch(() => null))) return reject('invalid');
      await client.join([staffRoom(user.restaurantId), memberRoom(user.sub)]);
      client.emit('ready');
      return;
    }
    const sessionId = (await this.tickets.sessionOf(client.handshake.auth?.ticket)) ?? parseCookie(client.handshake.headers.cookie, TABLE_COOKIE);
    const session = sessionId && /^[0-9a-f-]{36}$/.test(sessionId) ? await this.sessions.findOne({ where: { id: sessionId } }).catch(() => null) : null;
    if (!session || session.closedAt || session.expiresAt.getTime() < Date.now()) return reject('session');
    await client.join(tableRoom(session.tableId));
    client.emit('ready');
  }

  /** Answers the client's liveness check: a socket that cannot answer is dead even if it looks connected. */
  @SubscribeMessage('alive')
  alive() {
    return true;
  }
}
