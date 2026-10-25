// Waiter Service — Elo Digital API

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CallWaiter, CallStatus } from '@elo-digital/database/entities/CallWaiter';
import { Order, OrderStatus } from '@elo-digital/database/entities/Order';

import { WebsocketGateway } from '../../websockets/gateway';
import { WS_EVENTS, WS_ROOMS, createPayload } from '../../websockets/events';

@Injectable()
export class WaiterService {
  constructor(
    @InjectRepository(CallWaiter)
    private readonly callRepository: Repository<CallWaiter>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>
  ) {}

  async createCall(tableToken: string, input: any) {
    // In real implementation, get table from token
    // For now, mock implementation
    const call = this.callRepository.create({
      restaurantId: '', // from token
      tableId: '', // from token
      tableName: '', // from token
      status: CallStatus.PENDING,
      message: input.message
    });
    return this.callRepository.save(call);
  }

  async getCalls(restaurantId: string) {
    return this.callRepository.find({
      where: { restaurantId, status: 'pending' },
      order: { createdAt: 'ASC' }
    });
  }

  async getCall(callId: string) {
    const call = await this.callRepository.findOne({ where: { id: callId } });
    if (!call) throw new Error('Chamado não encontrado');
    return call;
  }

  async respondCall(callId: string, waiterId: string) {
    const call = await this.getCall(callId);
    if (call.status !== 'pending') throw new Error('Chamado já respondido');

    call.status = CallStatus.RESPONDED;
    call.respondedAt = new Date();
    call.respondedBy = waiterId;
    return this.callRepository.save(call);
  }

  async cancelCall(callId: string) {
    const call = await this.getCall(callId);
    if (call.status !== 'pending') throw new Error('Chamado não pode ser cancelado');

    call.status = 'cancelled';
    return this.callRepository.save(call);
  }

  async getValidations(restaurantId: string) {
    // Get orders pending validation
    return { pending: [], approved: [], rejected: [] };
  }
}