import { ConflictException, Injectable } from '@nestjs/common';
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
    if (await this.users.findOne({ where: { username: data.username } })) {
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
    return true;
  }
}
