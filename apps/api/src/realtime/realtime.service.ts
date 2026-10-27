import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

export const staffRoom = (restaurantId: string) => `r:${restaurantId}`;
export const tableRoom = (tableId: string) => `t:${tableId}`;

export interface RealtimeEvent {
  type: 'order.created' | 'order.updated' | 'order.cancelled' | 'table.updated' | 'call.created' | 'call.resolved';
  restaurantId: string;
  /** Quando presente, o cliente da mesa também recebe o evento. */
  tableId?: string;
  payload: unknown;
}

/**
 * Único ponto para emitir eventos em tempo real. Funcionários ouvem a sala do
 * restaurante; clientes ouvem apenas a sala da própria mesa.
 */
@Injectable()
export class RealtimeService {
  private server?: Server;

  attach(server: Server) {
    this.server = server;
  }

  publish(event: RealtimeEvent): void {
    if (!this.server) return;
    let target = this.server.to(staffRoom(event.restaurantId));
    if (event.tableId) target = target.to(tableRoom(event.tableId));
    target.emit(event.type, event.payload);
  }
}
