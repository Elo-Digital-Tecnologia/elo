import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { IsNull, Repository } from 'typeorm';
import { Role } from '@elo/core';
import { StaffUser } from '../database/entities';

export interface NewStaff {
  restaurantId: string | null;
  username: string;
  password: string;
  role: Role;
  permissions?: string[];
}

export type PublicStaff = Omit<StaffUser, 'passwordHash'>;

const strip = ({ passwordHash: _hash, ...rest }: StaffUser): PublicStaff => rest;

@Injectable()
export class StaffService {
  constructor(@InjectRepository(StaffUser) private readonly users: Repository<StaffUser>) {}

  async create(data: NewStaff): Promise<PublicStaff> {
    if (await this.users.findOne({ where: { username: data.username, restaurantId: data.restaurantId ?? IsNull() } })) {
      throw new ConflictException('username_taken');
    }
    const user = await this.users.save(
      this.users.create({
        restaurantId: data.restaurantId,
        username: data.username,
        passwordHash: await bcrypt.hash(data.password, 10),
        role: data.role,
        permissions: data.permissions ?? [],
      }),
    );
    return strip(user);
  }

  /** `restaurantId` nulo lista a equipe Elo. */
  async list(restaurantId: string | null): Promise<PublicStaff[]> {
    const rows = await this.users.find({ where: { restaurantId: restaurantId ?? IsNull() } });
    return rows.map(strip);
  }

  async setActive(id: string, restaurantId: string | null, active: boolean): Promise<boolean> {
    const user = await this.users.findOne({ where: { id } });
    if (!user || user.restaurantId !== restaurantId) return false;
    user.active = active;
    await this.users.save(user);
    this.activeCache.delete(id);
    return true;
  }

  /**
   * O JWT dura 12 h; usuário desativado perde o acesso em até alguns segundos.
   * Cache curto para não consultar o banco a cada requisição.
   */
  private readonly activeCache = new Map<string, { active: boolean; until: number }>();

  async isActive(id: string): Promise<boolean> {
    const hit = this.activeCache.get(id);
    if (hit && hit.until > Date.now()) return hit.active;
    const user = await this.users.findOne({ where: { id }, select: { id: true, active: true } });
    const active = !!user?.active;
    this.activeCache.set(id, { active, until: Date.now() + 10_000 });
    return active;
  }

  async changePassword(id: string, current: string, next: string): Promise<void> {
    const user = await this.users.findOne({ where: { id } });
    if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
      throw new UnauthorizedException('invalid_credentials');
    }
    if (current === next) throw new BadRequestException('same_password');
    user.passwordHash = await bcrypt.hash(next, 10);
    await this.users.save(user);
  }

  /** Administrador redefine a senha de alguém da própria equipe (sem e-mail no sistema). */
  async resetPassword(id: string, restaurantId: string | null, next: string): Promise<boolean> {
    const user = await this.users.findOne({ where: { id } });
    if (!user || user.restaurantId !== restaurantId) return false;
    user.passwordHash = await bcrypt.hash(next, 10);
    await this.users.save(user);
    return true;
  }
}
