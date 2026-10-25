// Billing Service — Elo Digital API

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Bill, BillStatus, SplitType, BillItem } from '@elo-digital/database/entities/Bill';
import { Order, OrderStatus } from '@elo-digital/database/entities/Order';
import { ServiceCharge } from '@elo-digital/database/entities/ServiceCharge';
import { Table } from '@elo-digital/database/entities/Table';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Bill)
    private readonly billRepository: Repository<Bill>,
    @InjectRepository(BillItem)
    private readonly billItemRepository: Repository<BillItem>,
    @InjectRepository(ServiceCharge)
    private readonly serviceChargeRepository: Repository<ServiceCharge>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>
  ) {}

  async calculateBill(tableId: string) {
    const table = await this.tableRepository.findOne({
      where: { id: tableId },
      relations: ['restaurant']
    });
    if (!table) throw new Error('Mesa não encontrada');

    // Find open order
    const order = await this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.tableId = :tableId', { tableId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: ['sent', 'received', 'preparing', 'ready', 'delivered']
      })
      .orderBy('order.createdAt', 'DESC')
      .getOne();

    if (!order) throw new Error('Nenhum pedido ativo para esta mesa');

    // Get service charge
    let serviceCharge = await this.serviceChargeRepository.findOne({
      where: { restaurantId: table.restaurantId }
    });
    if (!serviceCharge) {
      serviceCharge = { percentage: 10, isEnabled: true } as any;
    }

    // Calculate subtotal
    let subtotal = 0;
    for (const item of order.items) {
      subtotal += item.totalPrice;
    }

    const serviceChargeAmount = serviceCharge.isEnabled
      ? Math.round(subtotal * serviceCharge.percentage / 100)
      : 0;

    return {
      orderId: order.id,
      tableName: order.table?.name,
      items: order.items.map(item => ({
        id: item.id,
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.productPrice,
        totalPrice: item.totalPrice,
        notes: item.notes,
        options: item.selectedOptions
      })),
      subtotal: order.subtotal,
      serviceChargePercentage: serviceCharge.percentage,
      serviceChargeEnabled: serviceCharge.isEnabled,
      serviceChargeAmount,
      total: subtotal + serviceChargeAmount
    };
  }

  async getBill(restaurantId: string, billId: string) {
    const bill = await this.billRepository.findOne({
      where: { id: billId, restaurantId },
      relations: ['items', 'items.orderItem']
    });
    if (!bill) throw new Error('Conta não encontrada');
    return bill;
  }

  async getBillByTable(restaurantId: string, tableId: string) {
    const bill = await this.billRepository.findOne({
      where: { restaurantId, tableId, status: 'open' },
      relations: ['items']
    });
    return bill;
  }

  async createBillFromOrder(orderId: string, userId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'table', 'table.restaurant', 'session']
    });
    if (!order) throw new Error('Pedido não encontrado');

    // Check if bill already exists
    let bill = await this.billRepository.findOne({
      where: { orderId, status: 'open' }
    });

    if (bill) return bill;

    // Get service charge
    const serviceCharge = await this.serviceChargeRepository.findOne({
      where: { restaurantId: order.restaurantId }
    });

    // Create bill items
    const billItems = order.items.map(item => this.billItemRepository.create({
      orderItemId: item.id,
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.productPrice,
      totalPrice: item.totalPrice
    }));

    const subtotal = order.subtotal;
    const serviceChargePercentage = serviceCharge?.percentage || 10;
    const serviceChargeEnabled = serviceCharge?.isEnabled ?? true;
    const serviceChargeAmount = serviceChargeEnabled
      ? Math.round(subtotal * serviceChargePercentage / 100)
      : 0;

    bill = this.billRepository.create({
      restaurantId: order.restaurantId,
      tableId: order.tableId,
      orderId: order.id,
      items: billItems,
      subtotal,
      serviceChargePercentage,
      serviceCharge: serviceChargeEnabled ? Math.round(subtotal * serviceChargePercentage / 100) : 0,
      discount: 0,
      total: subtotal + (serviceChargeEnabled ? Math.round(subtotal * serviceChargePercentage / 100) : 0),
      splitType: 'none',
      splitCount: 1,
      status: BillStatus.OPEN
    });

    return this.billRepository.save(bill);
  }

  async updateSplit(billId: string, splitType: string, splitCount: number, userId: string) {
    const bill = await this.billRepository.findOne({ where: { id: billId } });
    if (!bill) throw new Error('Conta não encontrada');

    bill.splitType = splitType as any;
    bill.splitCount = splitCount;
    return this.billRepository.save(bill);
  }

  async toggleServiceCharge(billId: string, enabled: boolean, userId: string) {
    const bill = await this.billRepository.findOne({ where: { id: billId } });
    if (!bill) throw new Error('Conta não encontrada');

    // Recalculate total
    const serviceChargeAmount = enabled
      ? Math.round(bill.subtotal * 10 / 100) // default 10%
      : 0;

    bill.serviceCharge = serviceChargeAmount;
    bill.total = bill.subtotal + serviceChargeAmount - bill.discount;
    return this.billRepository.save(bill);
  }

  async applyDiscount(billId: string, amount: number, userId: string) {
    const bill = await this.billRepository.findOne({ where: { id: billId } });
    if (!bill) throw new Error('Conta não encontrada');

    if (amount > bill.subtotal) {
      throw new Error('Desconto não pode exceder subtotal');
    }

    bill.discount = amount;
    bill.total = bill.subtotal + bill.serviceCharge - amount;
    return this.billRepository.save(bill);
  }

  async closeBill(billId: string, userId: string) {
    const bill = await this.billRepository.findOne({ where: { id: billId } });
    if (!bill) throw new Error('Conta não encontrada');

    if (bill.status !== BillStatus.OPEN) {
      throw new Error('Conta já está fechada');
    }

    bill.status = BillStatus.CLOSED;
    bill.closedAt = new Date();
    return this.billRepository.save(bill);
  }

  async getBill(restaurantId: string, billId: string) {
    const bill = await this.billRepository.findOne({
      where: { id: billId, restaurantId },
      relations: ['items', 'items.orderItem']
    });
    if (!bill) throw new Error('Conta não encontrada');
    return bill;
  }
}