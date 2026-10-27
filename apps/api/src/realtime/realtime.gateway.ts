import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { AccessState } from '@elo/core';
import { corsOrigin } from '../config/cors';
import { TableSession } from '../database/entities';
import type { JwtUser } from '../common/auth-types';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { RealtimeService, staffRoom, tableRoom } from './realtime.service';

export const TABLE_COOKIE = 'elo_table';

function parseCookie(header: string | undefined, name: string): string | undefined {
  return header
    ?.split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === name)?.[1];
}

@WebSocketGateway({
  cors: { origin: corsOrigin, credentials: true },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private readonly realtime: RealtimeService,
    private readonly jwt: JwtService,
    private readonly restaurants: RestaurantsService,
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
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (token) {
        const user = await this.jwt.verifyAsync<JwtUser>(token);
        if (!user.restaurantId) return client.disconnect(true);
        const state = await this.restaurants.accessStateOf(user.restaurantId);
        if (state === AccessState.Suspended) return client.disconnect(true);
        await client.join(staffRoom(user.restaurantId));
        return;
      }
      const sessionId = parseCookie(client.handshake.headers.cookie, TABLE_COOKIE);
      const session = sessionId ? await this.sessions.findOne({ where: { id: sessionId } }) : null;
      if (!session || session.closedAt || session.expiresAt.getTime() < Date.now()) {
        return client.disconnect(true);
      }
      await client.join(tableRoom(session.tableId));
    } catch {
      client.disconnect(true);
    }
  }
}
