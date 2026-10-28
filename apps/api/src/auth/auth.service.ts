import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { IsNull, Repository } from 'typeorm';
import { ALL_PERMISSIONS, EloStaffRoles, Role } from '@elo/core';
import { Restaurant, StaffUser } from '../database/entities';
import type { JwtUser } from '../common/auth-types';
import type { Env } from '../config/env';

/** Dummy para igualar tempo de resposta quando o usuário não existe. */
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(StaffUser) private readonly users: Repository<StaffUser>,
    @InjectRepository(Restaurant) private readonly restaurants: Repository<Restaurant>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Login da equipe de um restaurante: o usuário só vale dentro do restaurante do endereço. */
  async restaurantLogin(slug: string, username: string, password: string): Promise<{ accessToken: string }> {
    const restaurant = await this.restaurants.findOne({ where: { slug } });
    const user = restaurant ? await this.users.findOne({ where: { username, restaurantId: restaurant.id } }) : null;
    return this.check(user, password, (u) => !EloStaffRoles.includes(u.role));
  }

  /** Login da equipe Elo Digital (sem restaurante). */
  async teamLogin(username: string, password: string): Promise<{ accessToken: string }> {
    const user = await this.users.findOne({ where: { username, restaurantId: IsNull() } });
    return this.check(user, password, (u) => EloStaffRoles.includes(u.role));
  }

  /** Mesma resposta e mesmo custo de hash para usuário ou restaurante inexistente, senha errada e conta inativa. */
  private async check(user: StaffUser | null, password: string, roleOk: (u: StaffUser) => boolean) {
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok || !user.active || !roleOk(user)) throw new UnauthorizedException('invalid_credentials');
    return this.sign({
      sub: user.id,
      role: user.role,
      restaurantId: user.restaurantId,
      permissions: user.permissions,
    });
  }

  /** Superadmin entra com a chave gerada, guardada só em variável de ambiente. */
  superadminLogin(key: string): Promise<{ accessToken: string }> {
    const expected = Buffer.from(this.config.get('SUPERADMIN_KEY', { infer: true }));
    const given = Buffer.from(key);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new UnauthorizedException('invalid_credentials');
    }
    return this.sign({
      sub: 'superadmin',
      role: Role.Superadmin,
      restaurantId: null,
      permissions: ALL_PERMISSIONS,
    });
  }

  private async sign(payload: JwtUser) {
    return { accessToken: await this.jwt.signAsync(payload) };
  }
}
