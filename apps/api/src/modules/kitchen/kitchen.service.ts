// Kitchen Service — Elo Digital API

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Order, OrderStatus, OrderItem, OrderItemStatus } from '@elo-digital/database/entities';
import { WebsocketGateway } from '../../websockets/gateway';
import { WS_EVENTS, WS_ROOMS, createPayload } from '../../websockets/events';

@Injectable()
export class KitchenService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly websocketGateway: WebsocketGateway
  ) {}

  async getKitchenOrders(restaurantId: string) {
    return this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.table', 'table')
      .where('order.restaurantId = :restaurantId', { restaurantId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.SENT, OrderStatus.RECEIVED, OrderStatus.PREPARING]
      })
      .orderBy('order.sentToKitchenAt', 'ASC')
      .getMany();
  }

  async getOrder(restaurantId: string, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, restaurantId },
      relations: ['items', 'table']
    });
    if (!order) throw new Error('Pedido não encontrado');
    return order;
  }

  async updateOrderStatus(restaurantId: string, orderId: string, status: OrderStatus, userId: string) {
    const order = await this.getOrder(restaurantId, orderId);
    const oldStatus = order.status;

    // Validate transition
    if (!this.isValidTransition(oldStatus, status)) {
      throw new BadRequestException(`Transição inválida: ${oldStatus} -> ${status}`);
    }

    order.status = status;
    await this.orderRepository.save(order);

    // Notify
    this.notifyStatusChange(order, oldStatus, status);

    return this.getOrder(restaurantId, orderId);
  }

  async updateItemStatus(restaurantId: string, orderId: string, itemId: string, status: OrderItemStatus, userId: string) {
    const order = await this.getOrder(restaurantId, orderId);
    const item = order.items.find(i => i.id === itemId);
    if (!item) throw new Error('Item não encontrado');

    item.status = status;
    await this.orderItemRepository.save(item);

    // Check if all items are ready
    const allReady = order.items.every(i => i.status === OrderItemStatus.READY);
    if (allReady && order.status !== OrderStatus.READY) {
      order.status = OrderStatus.READY;
      await this.orderRepository.save(order);
    }

    this.notifyItemStatusChange(order, item, status);

    return this.getOrder(restaurantId, orderId);
  }

  async getOrder(restaurantId: string, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, restaurantId },
      relations: ['items', 'table']
    });
    if (!order) throw new Error('Pedido não encontrado');
    return order;
  }

  private isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.SENT]: [OrderStatus.RECEIVED, OrderStatus.CANCELLED],
      [OrderStatus.RECEIVED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.CLOSED]: [],
      [OrderStatus.PENDING_VALIDATION]: [OrderStatus.SENT, OrderStatus.CANCELLED]
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  private notifyStatusChange(order: any, oldStatus: string, newStatus: string) {
    this.server?.to(`restaurant:${order.restaurantId}:kitchen`).emit('kitchen:status_changed', {
      timestamp: new Date().toISOString(),
      restaurantId: order.restaurantId,
      orderId: order.id,
      tableName: order.table?.name,
      oldStatus,
      newStatus,
      changedBy: ''
    });
  }

  private notifyItemStatusChange(order: any, item: any, status: string) {
    // Notify kitchen display
  }

  // Mock server for now
  private server = null;
}