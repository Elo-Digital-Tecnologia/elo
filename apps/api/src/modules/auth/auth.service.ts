// Auth Service — Elo Digital API

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User, UserRole } from '@elo-digital/database/entities/User';
import { Restaurant } from '@elo-digital/database/entities/Restaurant';
import { TableSession } from '@elo-digital/database/entities/TableSession';
import { TableToken } from '@elo-digital/database/entities/TableToken';

import { JwtConfig } from '../../config/jwt.config';

import {
  LoginInput,
  RegisterInput,
  CreateUserInput
} from '@elo-digital/core/validation';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(TableSession)
    private readonly tableSessionRepository: Repository<TableSession>,
    @InjectRepository(TableToken)
    private readonly tableTokenRepository: Repository<TableToken>,
    private readonly jwtService: JwtService,
    private readonly jwtConfig: JwtConfig
  ) {}

  // ============================================
  // Internal Auth (Dashboard users)
  // ============================================

  async login(input: LoginInput) {
    const user = await this.userRepository.findOne({
      where: { email: input.email },
      relations: ['restaurant']
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    const isValid = await user.validatePassword(input.password);
    if (!isValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    return this.generateTokens(user);
  }

  async register(input: RegisterInput) {
    const existing = await this.userRepository.findOne({
      where: { email: input.email }
    });

    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = this.userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
      role: UserRole.ADMIN_RESTAURANT,
      isActive: true
    });

    await this.userRepository.save(user);

    return this.generateTokens(user);
  }

  async createUser(input: CreateUserInput, currentUser: User) {
    // Check permissions
    if (!this.canManageUsers(currentUser)) {
      throw new UnauthorizedException('Sem permissão para criar usuários');
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
      throw new UnauthorizedException('Sem acesso a este restaurante');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = this.userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
      restaurantId: input.restaurantId || currentUser.restaurantId,
      isActive: true
    });

    await this.userRepository.save(user);

    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.jwtConfig.secret
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['restaurant']
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Usuário não encontrado ou inativo');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const isValid = await user.validatePassword(currentPassword);
    if (!isValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepository.save(user);

    return { success: true };
  }

  // ============================================
  // Table Session Auth (Public menu)
  // ============================================

  async createTableSession(tableToken: string) {
    const tableTokenEntity = await this.tableTokenRepository.findOne({
      where: { token: tableToken, isActive: true },
      relations: ['table', 'table.restaurant']
    });

    if (!tableTokenEntity) {
      throw new UnauthorizedException('Token de mesa inválido');
    }

    const table = tableTokenEntity.table;
    if (!table || table.status !== 'free') {
      throw new UnauthorizedException('Mesa não disponível');
    }

    // Create session
    const sessionToken = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + this.jwtConfig.sessionMaxAge);

    const session = this.tableSessionRepository.create({
      tableId: table.id,
      token: sessionToken,
      startedAt: new Date(),
      expiresAt,
      isActive: true
    });

    await this.tableSessionRepository.save(session);

    // Update table status
    table.status = 'occupied';
    await this.tableTokenRepository.manager.save(table);

    return {
      sessionToken,
      expiresAt,
      table: {
        id: table.id,
        name: table.name,
        number: table.number,
        restaurant: {
          id: table.restaurant.id,
          name: table.restaurant.name,
          slug: table.restaurant.slug
        }
      }
    };
  }

  async validateTableSession(sessionToken: string) {
    const session = await this.tableSessionRepository.findOne({
      where: { token: sessionToken, isActive: true },
      relations: ['table', 'table.restaurant']
    });

    if (!session) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    if (session.expiresAt < new Date()) {
      await this.closeTableSession(session.token);
      throw new UnauthorizedException('Sessão expirada');
    }

    return session;
  }

  async closeTableSession(sessionToken: string) {
    const session = await this.tableSessionRepository.findOne({
      where: { token: sessionToken, isActive: true },
      relations: ['table']
    });

    if (!session) return false;

    session.isActive = false;
    session.closedAt = new Date();
    await this.tableSessionRepository.save(session);

    // Update table status
    if (session.table) {
      session.table.status = 'free';
      await this.tableTokenRepository.manager.save(session.table);
    }

    return true;
  }

  // ============================================
  // Helpers
  // ============================================

  private generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      permissions: this.getPermissionsForRole(user.role)
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.jwtConfig.expiresIn
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: this.jwtConfig.refreshExpiresIn }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId,
        avatarUrl: user.avatarUrl
      },
      accessToken,
      refreshToken,
      expiresIn: this.jwtConfig.expiresIn
    };
  }

  private generateSessionToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getPermissionsForRole(role: UserRole): string[] {
    // This would come from RBAC config
    return [];
  }

  private canManageUsers(user: User): boolean {
    return ['superadmin', 'admin_elo', 'admin_restaurant'].includes(user.role);
  }

  private canAccessRestaurant(user: User, restaurantId: string): boolean {
    if (user.role === 'superadmin' || user.role === 'admin_elo') return true;
    return user.restaurantId === restaurantId;
  }
}