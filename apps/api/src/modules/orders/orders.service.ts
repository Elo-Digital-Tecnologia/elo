// Orders Service — Elo Digital API

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Order, OrderStatus, OrderItem, OrderStatusHistory } from '@elo-digital/database/entities';
import { Table, TableSession } from '@elo-digital/database/entities';

import { WebsocketGateway } from '../../websockets/gateway';
import { WS_EVENTS, WS_ROOMS, createPayload } from '../../websockets/events';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory)
    private readonly historyRepository: Repository<OrderStatusHistory>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(TableSession)
    private readonly sessionRepository: Repository<TableSession>,
    private readonly websocketGateway: WebsocketGateway
  ) {}

  async createFromSession(sessionId: string, input: any) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, isActive: true },
      relations: ['table', 'table.restaurant']
    });

    if (!session) throw new Error('Sessão inválida');

    const table = session.table;
    if (table.status !== 'occupied') {
      throw new Error('Mesa não está aberta');
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of input.items) {
      subtotal += item.quantity * item.unitPrice;
    }

    // Create order
    const order = this.orderRepository.create({
      restaurantId: table.restaurantId,
      tableId: table.id,
      sessionId,
      status: OrderStatus.PENDING_VALIDATION,
      items: input.items.map((item: any) => ({
        productId: item.productId,
        productName: item.name,
        productPrice: item.unitPrice,
        quantity: item.quantity,
        notes: item.notes,
        selectedOptions: item.selectedOptions || [],
        totalPrice: item.quantity * item.unitPrice
      })),
      subtotal,
      total: subtotal
    });

    const saved = await this.orderRepository.save(order);

    // Notify waiter for validation
    this.notifyWaiterValidation(saved);

    return this.getOrder(saved.id);
  }

  async validateOpen(orderId: string, waiterId: string, action: 'approve' | 'reject', reason?: string) {
    const order = await this.getOrder(orderId);

    if (order.status !== OrderStatus.PENDING_VALIDATION) {
      throw new Error('Pedido não está aguardando validação');
    }

    if (action === 'approve') {
      order.status = OrderStatus.SENT;
      order.sentToKitchenAt = new Date();
      await this.addHistory(order.id, OrderStatus.PENDING_VALIDATION, OrderStatus.SENT, waiterId);

      // Notify kitchen
      this.notifyKitchen(order);
    } else {
      order.status = OrderStatus.CANCELLED;
      await this.addHistory(order.id, OrderStatus.PENDING_VALIDATION, OrderStatus.CANCELLED, waiterId, reason);
    }

    await this.orderRepository.save(order);
    return this.getOrder(orderId);
  }

  async getOrder(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'table', 'session', 'statusHistory']
    });
    if (!order) throw new Error('Pedido não encontrado');
    return order;
  }

  async getOrders(restaurantId: string, filters: any = {}) {
    const query = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.table', 'table')
      .where('order.restaurantId = :restaurantId', { restaurantId })
      .orderBy('order.createdAt', 'DESC');

    if (filters.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters.tableId) {
      query.andWhere('order.tableId = :tableId', { tableId: filters.tableId });
    }

    return query.getMany();
  }

  async updateStatus(orderId: string, status: OrderStatus, userId: string, itemId?: string) {
    const order = await this.getOrder(orderId);
    const oldStatus = order.status;

    if (itemId) {
      // Update item status
      const item = order.items.find((i: OrderItem) => i.id === itemId);
      if (!item) throw new Error('Item não encontrado');
      item.status = status as any;
      await this.orderItemRepository.save(item);
    } else {
      order.status = status;
      await this.orderRepository.save(order);
    }

    await this.addHistory(orderId, oldStatus, status, userId);

    // Notify relevant parties
    this.notifyStatusChange(order, oldStatus, status);

    return this.getOrder(orderId);
  }

  async cancelOrder(orderId: string, userId: string, reason: string, userRole: string) {
    const order = await this.getOrder(orderId);

    // Check permissions based on role
    const canCancel = this.canCancel(userRole, order.status);
    if (!canCancel) {
      throw new ForbiddenException('Não pode cancelar este pedido');
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);
    await this.addHistory(orderId, order.status, OrderStatus.CANCELLED, userId, reason);

    // Notify kitchen
    this.notifyKitchen(order);

    return this.getOrder(orderId);
  }

  private async addHistory(orderId: string, fromStatus: string, toStatus: string, changedBy: string, reason?: string) {
    const history = this.historyRepository.create({
      orderId,
      fromStatus,
      toStatus,
      changedBy,
      reason
    });
    await this.historyRepository.save(history);
  }

  private canCancel(role: string, status: OrderStatus): boolean {
    if (role === 'admin' || role === 'superadmin') return true;
    if (role === 'waiter' && ['pending_validation', 'sent', 'received', 'preparing'].includes(status)) return true;
    if (role === 'client' && status === 'pending_validation') return true;
    return false;
  }

  private notifyWaiterValidation(order: Order) {
    this.websocketGateway.server?.to(
      WS_ROOMS.RESTAURANT_WAITER(order.restaurantId)
    ).emit(WS_EVENTS.WAITER_VALIDATION_REQUESTED, {
      timestamp: new Date().toISOString(),
      restaurantId: order.restaurantId,
      orderId: order.id,
      tableId: order.tableId,
      tableName: order.table?.name || '',
      items: order.items.map((i: OrderItem) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        notes: i.notes,
        options: i.selectedOptions
      })),
      total: order.total
    });
  }

  private notifyKitchen(order: Order) {
    this.websocketGateway.server?.to(
      WS_ROOMS.RESTAURANT_KITCHEN(order.restaurantId)
    ).emit(WS_EVENTS.KITCHEN_ORDER_RECEIVED, {
      timestamp: new Date().toISOString(),
      restaurantId: order.restaurantId,
      orderId: order.id,
      tableName: order.table?.name || '',
      tableNumber: order.table?.number,
      items: order.items.map((i: OrderItem) => ({
        id: i.id,
        productName: i.productName,
        quantity: i.quantity,
        notes: i.notes,
        options: i.selectedOptions,
        status: 'pending'
      })),
      priority: 'normal'
    });
  }

  private notifyStatusChange(order: Order, oldStatus: string, newStatus: string) {
    const payload = {
      timestamp: new Date().toISOString(),
      restaurantId: order.restaurantId,
      orderId: order.id,
      tableId: order.tableId,
      tableName: order.table?.name || '',
      oldStatus,
      newStatus,
      changedBy: ''
    };

    this.websocketGateway.server?.to(WS_ROOMS.RESTAURANT_ORDERS(order.restaurantId))
      .emit(WS_EVENTS.ORDER_STATUS_CHANGED, payload);
  }
}