import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { IsNull, Repository } from 'typeorm';
import { ALL_PERMISSIONS, EloStaffRoles, hasAnyRole, Role } from '@elo/core';
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
    const user = restaurant ? await this.users.findOne({ where: { username, restaurantId: restaurant.id, deletedAt: IsNull() } }) : null;
    return this.check(user, password, (u) => !hasAnyRole(u.roles, EloStaffRoles));
  }

  /** Login da equipe Elo Digital (sem restaurante). */
  async teamLogin(username: string, password: string): Promise<{ accessToken: string }> {
    const user = await this.users.findOne({ where: { username, restaurantId: IsNull(), deletedAt: IsNull() } });
    return this.check(user, password, (u) => hasAnyRole(u.roles, EloStaffRoles));
  }

  /** Mesma resposta e mesmo custo de hash para usuário ou restaurante inexistente, senha errada e conta inativa. */
  private async check(user: StaffUser | null, password: string, roleOk: (u: StaffUser) => boolean) {
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok || !user.active || !roleOk(user)) throw new UnauthorizedException('invalid_credentials');
    return this.sign({
      sub: user.id,
      roles: user.roles,
      name: user.name,
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
      roles: [Role.Superadmin],
      name: 'Superadmin',
      restaurantId: null,
      permissions: ALL_PERMISSIONS,
    });
  }

  /**
   * New token with the account's current roles, permissions and name, for screens open
   * when an administrator changed them. It ends when the original one would have.
   */
  async refresh(user: JwtUser & { exp?: number }): Promise<{ accessToken: string }> {
    if (user.impersonatedBy || user.sub === 'superadmin') throw new ForbiddenException();
    const row = await this.users.findOne({ where: { id: user.sub, deletedAt: IsNull() } });
    const left = (user.exp ?? 0) - Math.floor(Date.now() / 1000);
    if (!row || !row.active || left <= 0) throw new UnauthorizedException();
    const payload: JwtUser = { sub: row.id, roles: row.roles, name: row.name, restaurantId: row.restaurantId, permissions: row.permissions };
    return { accessToken: await this.jwt.signAsync(payload, { expiresIn: left }) };
  }

  private async sign(payload: JwtUser) {
    return { accessToken: await this.jwt.signAsync(payload) };
  }
}
