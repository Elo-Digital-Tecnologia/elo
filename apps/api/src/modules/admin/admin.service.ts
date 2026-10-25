// Admin Service — Elo Digital API

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserRole } from '@elo-digital/database/entities/User';
import { Restaurant } from '@elo-digital/database/entities/Restaurant';
import { Subscription } from '@elo-digital/database/entities/Subscription';

import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>
  ) {}

  // Dashboard Stats
  async getDashboardStats() {
    const [totalRestaurants, activeRestaurants, suspendedRestaurants, totalUsers, totalSubscriptions, activeSubscriptions] = await Promise.all([
      this.restaurantRepository.count(),
      this.restaurantRepository.count({ where: { isActive: true } }),
      this.restaurantRepository.count({ where: { isActive: false } }),
      this.userRepository.count(),
      this.subscriptionRepository.count(),
      this.subscriptionRepository.count({ where: { status: 'active' } })
    ]);

    return {
      restaurants: {
        total: totalRestaurants,
        active: activeRestaurants,
        suspended: suspendedRestaurants
      },
      users: {
        total: totalUsers
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions
      }
    };
  }

  // Team Management
  async createTeamMember(input: any, currentUser: any) {
    const existing = await this.userRepository.findOne({ where: { email: input.email } });
    if (existing) throw new Error('Email já cadastrado');

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = this.userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
      isActive: true
    });

    return this.userRepository.save(user);
  }

  async getTeamMembers(page = 1, pageSize = 20) {
    const [data, total] = await this.userRepository.findAndCount({
      where: { role: 'admin_elo' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async updateTeamMember(id: string, input: any) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new Error('Usuário não encontrado');

    Object.assign(user, input);
    return this.userRepository.save(user);
  }

  async deleteTeamMember(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new Error('Usuário não encontrado');

    await this.userRepository.remove(user);
    return { success: true };
  }

  // Restaurant Management (override)
  async suspendRestaurant(id: string) {
    const restaurant = await this.restaurantRepository.findOne({ where: { id } });
    if (!restaurant) throw new Error('Restaurante não encontrado');

    restaurant.isActive = false;
    await this.restaurantRepository.save(restaurant);

    if (restaurant.subscription) {
      restaurant.subscription.status = 'suspended';
      await this.subscriptionRepository.save(restaurant.subscription);
    }

    return restaurant;
  }

  async reactivateRestaurant(id: string) {
    const restaurant = await this.restaurantRepository.findOne({ where: { id } });
    if (!restaurant) throw new Error('Restaurante não encontrado');

    restaurant.isActive = true;
    await this.restaurantRepository.save(restaurant);

    if (restaurant.subscription) {
      restaurant.subscription.status = 'active';
      await this.subscriptionRepository.save(restaurant.subscription);
    }

    return restaurant;
  }

  // System Settings
  async getSystemSettings() {
    return {
      superadminKey: process.env.SUPERADMIN_KEY ? '***' : 'not_set',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN,
      sessionMaxAge: process.env.SESSION_MAX_AGE,
      webMenuUrl: process.env.WEB_MENU_URL,
      webAdminUrl: process.env.WEB_ADMIN_URL,
      webRestaurantUrl: process.env.WEB_RESTAURANT_URL,
      webKitchenUrl: process.env.WEB_KITCHEN_URL
    };
  }
}