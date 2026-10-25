// Restaurants Service — Elo Digital API

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Restaurant } from '@elo-digital/database/entities/Restaurant';
import { Subscription } from '@elo-digital/database/entities/Subscription';
import { User } from '@elo-digital/database/entities/User';

import { CreateRestaurantInput, UpdateRestaurantInput } from '@elo-digital/core/validation';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async create(input: CreateRestaurantInput, currentUser: any) {
    // Check slug uniqueness
    const existing = await this.restaurantRepository.findOne({
      where: { slug: input.slug }
    });

    if (existing) {
      throw new ConflictException('Slug já está em uso');
    }

    // Create restaurant
    const restaurant = this.restaurantRepository.create({
      ...input,
      isActive: true
    });

    await this.restaurantRepository.save(restaurant);

    // Create default subscription (trial)
    const subscription = this.subscriptionRepository.create({
      restaurantId: restaurant.id,
      planId: 'basic',
      status: 'trialing',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    await this.subscriptionRepository.save(subscription);

    // Create admin user for restaurant
    const adminUser = this.userRepository.create({
      email: `admin@${input.slug}.local`,
      name: input.ownerName,
      role: 'admin_restaurant',
      restaurantId: restaurant.id,
      isActive: true
    });

    await this.userRepository.save(adminUser);

    return this.findOne(restaurant.id);
  }

  async findAll(page = 1, pageSize = 20, filters: any = {}) {
    const query = this.restaurantRepository.createQueryBuilder('restaurant')
      .leftJoinAndSelect('restaurant.subscription', 'subscription')
      .orderBy('restaurant.createdAt', 'DESC');

    if (filters.isActive !== undefined) {
      query.andWhere('restaurant.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters.search) {
      query.andWhere('(restaurant.name ILIKE :search OR restaurant.slug ILIKE :search)', {
        search: `%${filters.search}%`
      });
    }

    const [data, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  async findOne(id: string) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id },
      relations: ['subscription', 'users']
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurante não encontrado');
    }

    return restaurant;
  }

  async findBySlug(slug: string) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { slug },
      relations: ['subscription', 'users', 'categories', 'tables']
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurante não encontrado');
    }

    return restaurant;
  }

  async update(id: string, input: UpdateRestaurantInput) {
    const restaurant = await this.findOne(id);

    // Check slug uniqueness if changed
    if (input.slug && input.slug !== restaurant.slug) {
      const existing = await this.restaurantRepository.findOne({
        where: { slug: input.slug }
      });
      if (existing) {
        throw new ConflictException('Slug já está em uso');
      }
    }

    Object.assign(restaurant, input);
    await this.restaurantRepository.save(restaurant);

    return this.findOne(id);
  }

  async updateSettings(id: string, settings: any) {
    const restaurant = await this.findOne(id);
    // In a real app, this would update a settings column or separate table
    // For now, we'll just return the restaurant
    return this.findOne(id);
  }

  async suspend(id: string) {
    const restaurant = await this.findOne(id);
    restaurant.isActive = false;
    await this.restaurantRepository.save(restaurant);

    // Update subscription status
    if (restaurant.subscription) {
      restaurant.subscription.status = 'suspended';
      await this.subscriptionRepository.save(restaurant.subscription);
    }

    return this.findOne(id);
  }

  async reactivate(id: string) {
    const restaurant = await this.findOne(id);
    restaurant.isActive = true;
    await this.restaurantRepository.save(restaurant);

    if (restaurant.subscription) {
      restaurant.subscription.status = 'active';
      await this.subscriptionRepository.save(restaurant.subscription);
    }

    return this.findOne(id);
  }

  async delete(id: string) {
    const restaurant = await this.findOne(id);
    await this.restaurantRepository.remove(restaurant);
    return { success: true };
  }

  async getStats(id: string) {
    const restaurant = await this.findOne(id);

    // In a real app, this would aggregate real data
    return {
      totalOrders: 0,
      totalRevenue: 0,
      activeTables: 0,
      subscriptionStatus: restaurant.subscription?.status || 'none',
      daysUntilExpiry: restaurant.subscription?.currentPeriodEnd
        ? Math.ceil((new Date(restaurant.subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null
    };
  }
}