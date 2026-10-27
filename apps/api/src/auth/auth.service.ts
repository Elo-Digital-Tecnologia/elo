import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { ALL_PERMISSIONS, Role } from '@elo/core';
import { StaffUser } from '../database/entities';
import type { JwtUser } from '../common/auth-types';
import type { Env } from '../config/env';

/** Dummy para igualar tempo de resposta quando o usuário não existe. */
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(StaffUser) private readonly users: Repository<StaffUser>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async login(username: string, password: string): Promise<{ accessToken: string }> {
    const user = await this.users.findOne({ where: { username } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok || !user.active) throw new UnauthorizedException('invalid_credentials');
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
