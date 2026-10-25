// Users Service — Elo Digital API

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserRole } from '@elo-digital/database/entities/User';

import { CreateUserInput, UpdateUserInput } from '@elo-digital/core/validation';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async create(input: CreateUserInput, currentUser: any) {
    // Check permissions
    if (!['superadmin', 'admin_elo', 'admin_restaurant'].includes(currentUser.role)) {
      throw new Error('Sem permissão para criar usuários');
    }

    // Check email uniqueness
    const existing = await this.userRepository.findOne({
      where: { email: input.email }
    });

    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    // Validate restaurant access
    if (input.restaurantId && !this.canAccessRestaurant(currentUser, input.restaurantId)) {
      throw new BadRequestException('Sem acesso a este restaurante');
    }

    // Role restrictions
    if (currentUser.role === 'admin_restaurant' && input.role === 'admin_restaurant') {
      throw new BadRequestException('Não pode criar outro admin do restaurante');
    }

    const user = this.userRepository.create({
      ...input,
      isActive: true
    });

    await this.userRepository.save(user);
    return this.findOne(user.id);
  }

  async findAll(restaurantId: string, page = 1, pageSize = 20) {
    const query = this.userRepository.createQueryBuilder('user')
      .where('user.restaurantId = :restaurantId', { restaurantId })
      .orderBy('user.createdAt', 'DESC');

    const [data, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['restaurant']
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(id: string, input: UpdateUserInput, currentUser: any) {
    const user = await this.findOne(id);

    // Check permissions
    if (currentUser.id !== id && !this.canManageUsers(currentUser, user)) {
      throw new Error('Sem permissão para editar este usuário');
    }

    // Role restrictions
    if (input.role && !this.canAssignRole(currentUser, input.role)) {
      throw new BadRequestException('Não pode atribuir este papel');
    }

    Object.assign(user, input);
    await this.userRepository.save(user);

    return this.findOne(id);
  }

  async changeRole(id: string, role: UserRole, currentUser: any) {
    const user = await this.findOne(id);

    if (!this.canAssignRole(currentUser, role)) {
      throw new BadRequestException('Não pode atribuir este papel');
    }

    user.role = role;
    await this.userRepository.save(user);

    return this.findOne(id);
  }

  async delete(id: string, currentUser: any) {
    const user = await this.findOne(id);

    if (currentUser.id === id) {
      throw new BadRequestException('Não pode excluir a si mesmo');
    }

    if (!this.canManageUsers(currentUser, user)) {
      throw new Error('Sem permissão para excluir este usuário');
    }

    await this.userRepository.remove(user);
    return { success: true };
  }

  async toggleActive(id: string, currentUser: any) {
    const user = await this.findOne(id);

    if (!this.canManageUsers(currentUser, user)) {
      throw new Error('Sem permissão');
    }

    user.isActive = !user.isActive;
    await this.userRepository.save(user);

    return this.findOne(id);
  }

  private canAccessRestaurant(currentUser: any, restaurantId: string): boolean {
    if (currentUser.role === 'superadmin' || currentUser.role === 'admin_elo') return true;
    return currentUser.restaurantId === restaurantId;
  }

  private canManageUsers(currentUser: any, targetUser: any): boolean {
    if (currentUser.role === 'superadmin' || currentUser.role === 'admin_elo') return true;
    if (currentUser.role === 'admin_restaurant' && targetUser.restaurantId === currentUser.restaurantId) {
      return currentUser.id !== targetUser.id;
    }
    return false;
  }

  private canAssignRole(currentUser: any, role: string): boolean {
    if (currentUser.role === 'superadmin') return true;
    if (currentUser.role === 'admin_elo') return ['admin_restaurant', 'waiter', 'kitchen', 'cashier'].includes(role);
    if (currentUser.role === 'admin_restaurant') return ['waiter', 'kitchen', 'cashier'].includes(role);
    return false;
  }
}