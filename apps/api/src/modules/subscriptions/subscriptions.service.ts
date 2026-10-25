// Subscriptions Service — Elo Digital API

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { Subscription, SubscriptionStatus } from '@elo-digital/database/entities/Subscription';
import { Payment, PaymentMethod, PaymentStatus } from '@elo-digital/database/entities/Payment';
import { Restaurant } from '@elo-digital/database/entities/Restaurant';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>
  ) {}

  async getAll(page = 1, pageSize = 20, filters: any = {}) {
    const query = this.subscriptionRepository.createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.restaurant', 'restaurant')
      .leftJoinAndSelect('subscription.payments', 'payments')
      .orderBy('subscription.createdAt', 'DESC');

    if (filters.status) {
      query.andWhere('subscription.status = :status', { status: filters.status });
    }

    if (filters.restaurantId) {
      query.andWhere('subscription.restaurantId = :restaurantId', { restaurantId: filters.restaurantId });
    }

    const [data, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async getOne(id: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['restaurant', 'payments']
    });
    if (!subscription) throw new Error('Assinatura não encontrada');
    return subscription;
  }

  async getByRestaurant(restaurantId: string) {
    return this.subscriptionRepository.findOne({
      where: { restaurantId },
      relations: ['payments']
    });
  }

  async create(input: any) {
    const restaurant = await this.restaurantRepository.findOne({ where: { id: input.restaurantId } });
    if (!restaurant) throw new Error('Restaurante não encontrado');

    const subscription = this.subscriptionRepository.create({
      ...input,
      status: SubscriptionStatus.TRIALING,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    return this.subscriptionRepository.save(subscription);
  }

  async update(id: string, input: any) {
    const subscription = await this.getOne(id);
    Object.assign(subscription, input);
    return this.subscriptionRepository.save(subscription);
  }

  async suspend(id: string) {
    const subscription = await this.getOne(id);
    subscription.status = SubscriptionStatus.SUSPENDED;
    await this.subscriptionRepository.save(subscription);

    if (subscription.restaurant) {
      subscription.restaurant.isActive = false;
      await this.restaurantRepository.save(subscription.restaurant);
    }

    return this.getOne(id);
  }

  async reactivate(id: string) {
    const subscription = await this.getOne(id);
    subscription.status = SubscriptionStatus.ACTIVE;
    await this.subscriptionRepository.save(subscription);

    if (subscription.restaurant) {
      subscription.restaurant.isActive = true;
      await this.restaurantRepository.save(subscription.restaurant);
    }

    return this.getOne(id);
  }

  async recordPayment(id: string, input: any, userId: string) {
    const subscription = await this.getOne(id);

    const payment = this.paymentRepository.create({
      subscriptionId: id,
      amount: input.amount,
      method: input.method,
      status: PaymentStatus.CONFIRMED,
      reference: input.reference,
      notes: input.notes,
      recordedBy: userId,
      recordedAt: new Date(),
      confirmedAt: new Date()
    });

    await this.paymentRepository.save(payment);

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.currentPeriodEnd = new Date(subscription.currentPeriodEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
    await this.subscriptionRepository.save(subscription);

    if (subscription.restaurant && !subscription.restaurant.isActive) {
      subscription.restaurant.isActive = true;
      await this.restaurantRepository.save(subscription.restaurant);
    }

    return this.getOne(id);
  }

  async getPayments(subscriptionId: string) {
    return this.paymentRepository.find({
      where: { subscriptionId },
      order: { recordedAt: 'DESC' }
    });
  }

  async checkExpiringSubscriptions() {
    const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiring = await this.subscriptionRepository.find({
      where: {
        status: In([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]),
        currentPeriodEnd: In([gracePeriodEnd])
      },
      relations: ['restaurant']
    });

    return expiring;
  }
}