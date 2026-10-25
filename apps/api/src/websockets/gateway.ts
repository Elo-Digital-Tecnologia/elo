// WebSocket Gateway — Elo Digital API
// Main Socket.IO gateway for real-time communication

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

import {
  WS_EVENTS,
  WS_ROOMS,
  ClientEvents,
  ServerEvents,
  createPayload
} from './events';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
    credentials: true
  },
  namespace: '/ws'
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private connectedClients = new Map<string, { socket: Socket; userId: string; restaurantId?: string; tableToken?: string }>();

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Authenticate connection
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.emit(WS_EVENTS.AUTH_ERROR, { message: 'Token não fornecido' });
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = await this.jwtService.verifyAsync(token);
      client.data.user = payload;

      // Join restaurant rooms based on role
      if (payload.restaurantId) {
        const rooms = [
          WS_ROOMS.RESTAURANT_ORDERS(payload.restaurantId),
          WS_ROOMS.RESTAURANT_KITCHEN(payload.restaurantId),
          WS_ROOMS.RESTAURANT_WAITER(payload.restaurantId),
          WS_ROOMS.RESTAURANT_BILLING(payload.restaurantId)
        ];
        rooms.forEach(room => client.join(room));
      }

      // Track connected client
      this.connectedClients.set(client.id, {
        socket: client,
        userId: payload.sub,
        restaurantId: payload.restaurantId
      });

      client.emit(WS_EVENTS.AUTH_SUCCESS, {
        userId: payload.sub,
        role: payload.role,
        restaurantId: payload.restaurantId
      });

      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Connection auth failed: ${message}`);
      client.emit(WS_EVENTS.AUTH_ERROR, { message: 'Token inválido ou expirado' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ============================================
  // Order Events
  // ============================================

  @SubscribeMessage('order:update_status')
  async handleOrderStatusUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; status: string; itemId?: string }
  ) {
    // Validate permissions
    const user = client.data.user;
    if (!user.permissions?.includes('order:manage_status') && !user.permissions?.includes('kitchen:update_status')) {
      throw new WsException('Permissão insuficiente');
    }

    // Broadcast to restaurant order room
    const restaurantId = user.restaurantId;
    if (restaurantId) {
      this.server.to(WS_ROOMS.RESTAURANT_ORDERS(restaurantId)).emit(
        WS_EVENTS.ORDER_STATUS_CHANGED,
        createPayload({
          orderId: data.orderId,
          tableId: '', // Would be fetched from DB
          tableName: '',
          oldStatus: '',
          newStatus: data.status,
          changedBy: user.sub
        }, restaurantId)
      );
    }
  }

  // ============================================
  // Kitchen Events
  // ============================================

  @SubscribeMessage('kitchen:update_status')
  async handleKitchenStatusUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; itemId?: string; status: string }
  ) {
    const user = client.data.user;
    if (!user.permissions?.includes('kitchen:update_status')) {
      throw new WsException('Permissão insuficiente');
    }

    const restaurantId = user.restaurantId;
    if (restaurantId) {
      this.server.to(WS_ROOMS.RESTAURANT_KITCHEN(restaurantId)).emit(
        WS_EVENTS.KITCHEN_STATUS_CHANGED,
        createPayload({
          orderId: data.orderId,
          itemId: data.itemId,
          oldStatus: '',
          newStatus: data.status,
          changedBy: user.sub
        }, restaurantId)
      );
    }
  }

  // ============================================
  // Waiter Events
  // ============================================

  @SubscribeMessage('waiter:respond_call')
  async handleWaiterRespondCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string }
  ) {
    const user = client.data.user;
    if (!user.permissions?.includes('waiter:respond_calls')) {
      throw new WsException('Permissão insuficiente');
    }

    const restaurantId = user.restaurantId;
    if (restaurantId) {
      this.server.to(WS_ROOMS.RESTAURANT_WAITER(restaurantId)).emit(
        WS_EVENTS.WAITER_CALL_RESPONDED,
        createPayload({
          callId: data.callId,
          tableId: '', // From DB
          respondedBy: user.sub
        }, restaurantId)
      );
    }
  }

  @SubscribeMessage('waiter:validate_open')
  async handleWaiterValidateOpen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; action: 'approve' | 'reject'; reason?: string }
  ) {
    const user = client.data.user;
    if (!user.permissions?.includes('waiter:validate_open')) {
      throw new WsException('Permissão insuficiente');
    }

    const restaurantId = user.restaurantId;
    if (restaurantId) {
      // Broadcast to both order room and table
      this.server.to(WS_ROOMS.RESTAURANT_ORDERS(restaurantId)).emit(
        WS_EVENTS.ORDER_STATUS_CHANGED,
        createPayload({
          orderId: data.orderId,
          tableId: '',
          tableName: '',
          oldStatus: 'pending_validation',
          newStatus: data.action === 'approve' ? 'sent' : 'cancelled',
          changedBy: user.sub
        }, restaurantId)
      );
    }
  }

  // ============================================
  // Billing Events
  // ============================================

  @SubscribeMessage('billing:split')
  async handleBillingSplit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { billId: string; splitType: string; splitCount?: number }
  ) {
    const user = client.data.user;
    if (!user.permissions?.includes('billing:split')) {
      throw new WsException('Permissão insuficiente');
    }

    const restaurantId = user.restaurantId;
    if (restaurantId) {
      this.server.to(WS_ROOMS.RESTAURANT_BILLING(restaurantId)).emit(
        WS_EVENTS.BILL_SPLIT_CHANGED,
        createPayload({
          billId: data.billId,
          tableId: '',
          splitType: data.splitType,
          splitCount: data.splitCount || 1
        }, restaurantId)
      );
    }
  }

  @SubscribeMessage('billing:service_charge')
  async handleBillingServiceCharge(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { billId: string; enabled: boolean }
  ) {
    const user = client.data.user;
    if (!user.permissions?.includes('billing:apply_charges')) {
      throw new WsException('Permissão insuficiente');
    }

    const restaurantId = user.restaurantId;
    if (restaurantId) {
      this.server.to(WS_ROOMS.RESTAURANT_BILLING(restaurantId)).emit(
        WS_EVENTS.BILL_UPDATED,
        createPayload({
          billId: data.billId,
          tableId: '',
          total: 0, // Would be recalculated
          splitType: 'none',
          splitCount: 1
        }, restaurantId)
      );
    }
  }

  @SubscribeMessage('billing:discount')
  async handleBillingDiscount(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { billId: string; amount: number }
  ) {
    const user = client.data.user;
    if (!user.permissions?.includes('billing:apply_charges')) {
      throw new WsException('Permissão insuficiente');
    }

    const restaurantId = user.restaurantId;
    if (restaurantId) {
      this.server.to(WS_ROOMS.RESTAURANT_BILLING(restaurantId)).emit(
        WS_EVENTS.BILL_UPDATED,
        createPayload({
          billId: data.billId,
          tableId: '',
          total: 0,
          splitType: 'none',
          splitCount: 1
        }, restaurantId)
      );
    }
  }

  @SubscribeMessage('billing:close')
  async handleBillingClose(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { billId: string }
  ) {
    const user = client.data.user;
    if (!user.permissions?.includes('billing:close')) {
      throw new WsException('Permissão insuficiente');
    }

    const restaurantId = user.restaurantId;
    if (restaurantId) {
      this.server.to(WS_ROOMS.RESTAURANT_BILLING(restaurantId)).emit(
        WS_EVENTS.BILL_CLOSED,
        createPayload({
          billId: data.billId,
          tableId: '',
          total: 0,
          closedBy: user.sub
        }, restaurantId)
      );
    }
  }

  // ============================================
  // Table Events (Client-facing)
  // ============================================

  @SubscribeMessage('subscribe:table')
  async handleTableSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableToken: string }
  ) {
    // For table clients, validate table token
    // In real implementation, validate against database
    client.join(WS_ROOMS.TABLE(data.tableToken));
    client.data.tableToken = data.tableToken;
  }

  // ============================================
  // Admin Events
  // ============================================

  @SubscribeMessage('subscribe:orders')
  async handleSubscribeOrders(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { restaurantId: string }
  ) {
    const user = client.data.user;
    if (!user.permissions?.includes('order:read')) {
      throw new WsException('Permissão insuficiente');
    }
    client.join(WS_ROOMS.RESTAURANT_ORDERS(data.restaurantId));
  }

  @SubscribeMessage('subscribe:kitchen')
  async handleSubscribeKitchen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { restaurantId: string }
  ) {
    const user = client.data.user;
    if (!user.permissions?.includes('kitchen:read')) {
      throw new WsException('Permissão insuficiente');
    }
    client.join(WS_ROOMS.RESTAURANT_KITCHEN(data.restaurantId));
  }

  @SubscribeMessage('subscribe:waiter')
  async handleSubscribeWaiter(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { restaurantId: string }
  ) {
    const user = client.data.user;
    if (!user.permissions?.includes('waiter:read_calls')) {
      throw new WsException('Permissão insuficiente');
    }
    client.join(WS_ROOMS.RESTAURANT_WAITER(data.restaurantId));
  }

  @SubscribeMessage('subscribe:billing')
  async handleSubscribeBilling(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { restaurantId: string }
  ) {
    const user = client.data.user;
    if (!user.permissions?.includes('billing:read')) {
      throw new WsException('Permissão insuficiente');
    }
    client.join(WS_ROOMS.RESTAURANT_BILLING(data.restaurantId));
  }

  // ============================================
  // Utility
  // ============================================

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }
}