import type { Server } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { PushService } from '#/modules/push/push.service.js';

export const staffRoom = (restaurantId: string) => `r:${restaurantId}`;
export const tableRoom = (tableId: string) => `t:${tableId}`;
export const memberRoom = (userId: string) => `u:${userId}`;

export interface RealtimeEvent {
    type:
        | 'order.created'
        | 'order.updated'
        | 'order.cancelled'
        | 'table.updated'
        | 'call.created'
        | 'call.resolved'
        | 'bill.updated'
        | 'staff.updated'
        | 'restaurant.availability';
    restaurantId: string;
    /** When present, the guest at the table also gets the event. */
    tableId?: string;
    payload: unknown;
}

/**
 * Single place to emit realtime events. Staff listen to the restaurant room; guests
 * listen only to their own table room.
 */
@Injectable()
export class RealtimeService {
    private server?: Server;

    constructor(private readonly push: PushService) {}

    public attach(server: Server) {
        this.server = server;
    }

    /** Drops the staff sockets of a restaurant; on reconnect the gateway tells them why they are refused. */
    public disconnectRestaurant(restaurantId: string): void {
        this.server?.in(staffRoom(restaurantId)).disconnectSockets(true);
    }

    /** Drops one member's live screens (deactivated or archived); on reconnect they are refused. */
    public disconnectMember(userId: string): void {
        this.server?.in(memberRoom(userId)).disconnectSockets(true);
    }

    /** Emits to the open screens and, for alerts, to the staff phones subscribed to push. */
    public publish(event: RealtimeEvent): void {
        this.push.dispatch(event.type, event.restaurantId, event.tableId, event.payload);
        if (!this.server) return;
        let target = this.server.to(staffRoom(event.restaurantId));
        if (event.tableId) target = target.to(tableRoom(event.tableId));
        target.emit(event.type, event.payload);
    }
}
