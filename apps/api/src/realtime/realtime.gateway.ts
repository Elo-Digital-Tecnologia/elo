import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { AccessState } from '@elo/core';
import { corsOrigin } from '../config/cors';
import { TableSession } from '../database/entities';
import type { JwtUser } from '../common/auth-types';
import { StaffService } from '../staff/staff.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { RealtimeService, staffRoom, tableRoom, memberRoom } from './realtime.service';

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
  ) {}

  afterInit(server: Server) {
    this.realtime.attach(server);
  }

  /**
   * Funcionário: JWT em `auth.token`. Cliente: cookie de sessão da mesa.
   * Mecanismos separados; sem credencial válida, a conexão cai.
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
      const state = await this.restaurants.accessStateOf(user.restaurantId).catch(() => null);
      if (!state) return reject('invalid');
      if (state === AccessState.Suspended) return reject('suspended');
      // A deactivated or archived member keeps a valid token for hours; the live feed stops at once.
      if (!user.impersonatedBy && !(await this.staff.access(user.sub).catch(() => null))) return reject('invalid');
      await client.join([staffRoom(user.restaurantId), memberRoom(user.sub)]);
      return;
    }
    const sessionId = parseCookie(client.handshake.headers.cookie, TABLE_COOKIE);
    const session = sessionId ? await this.sessions.findOne({ where: { id: sessionId } }).catch(() => null) : null;
    if (!session || session.closedAt || session.expiresAt.getTime() < Date.now()) return reject('session');
    await client.join(tableRoom(session.tableId));
  }
}
