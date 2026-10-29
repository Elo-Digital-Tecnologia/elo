import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { ArrayContains, In, IsNull, Not, Repository } from 'typeorm';
import { guestFacingName, Role, type StaffAction, staffRule, TableState } from '@elo/core';
import type { JwtUser } from '../common/auth-types';
import { DiningTable, StaffUser } from '../database/entities';

export interface NewStaff {
  restaurantId: string | null;
  username: string;
  password: string;
  name: string;
  displayName?: string | null;
  roles: Role[];
  permissions?: string[];
}

export interface StaffChanges {
  name?: string;
  displayName?: string | null;
  roles?: Role[];
  /** Elo team only. */
  permissions?: string[];
}

export type PublicStaff = Omit<StaffUser, 'passwordHash'>;

/** Name pair used wherever a team member is shown: full name to staff, short name to guests. */
export interface StaffName {
  name: string;
  guestName: string;
}

const strip = ({ passwordHash: _hash, ...rest }: StaffUser): PublicStaff => rest;
const notArchived = { deletedAt: IsNull() };

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffUser) private readonly users: Repository<StaffUser>,
    @InjectRepository(DiningTable) private readonly tables: Repository<DiningTable>,
  ) {}

  async create(data: NewStaff): Promise<PublicStaff> {
    const scope = { username: data.username, restaurantId: data.restaurantId ?? IsNull(), ...notArchived };
    if (await this.users.findOne({ where: scope })) throw new ConflictException('username_taken');
    const user = await this.users.save(
      this.users.create({
        restaurantId: data.restaurantId,
        username: data.username,
        name: data.name.trim(),
        displayName: data.displayName?.trim() || null,
        passwordHash: await bcrypt.hash(data.password, 10),
        roles: data.roles,
        permissions: data.permissions ?? [],
      }),
    );
    return strip(user);
  }

  /** `restaurantId` null lists the Elo team. Archived accounts are left out. */
  async list(restaurantId: string | null): Promise<PublicStaff[]> {
    const rows = await this.users.find({
      where: { restaurantId: restaurantId ?? IsNull(), ...notArchived },
      order: { name: 'ASC' },
    });
    return rows.map(strip);
  }

  async update(id: string, restaurantId: string | null, actor: JwtUser, changes: StaffChanges): Promise<PublicStaff> {
    const user = await this.find(id, restaurantId);
    if (changes.roles) await this.authorize(actor, user, 'change_roles', changes.roles);
    else await this.authorize(actor, user, 'edit');
    if (changes.name !== undefined) user.name = changes.name.trim();
    if (changes.displayName !== undefined) user.displayName = changes.displayName?.trim() || null;
    if (changes.roles) user.roles = changes.roles;
    if (changes.permissions && !user.restaurantId) user.permissions = changes.permissions;
    return strip(await this.users.save(user));
  }

  async setActive(id: string, restaurantId: string | null, actor: JwtUser, active: boolean): Promise<void> {
    const user = await this.find(id, restaurantId);
    if (!active) await this.authorize(actor, user, 'set_active');
    else await this.authorize(actor, user, 'edit');
    user.active = active;
    await this.users.save(user);
    this.activeCache.delete(id);
  }

  /** Administrator sets a new password for a team member (there is no e-mail in the system). */
  async resetPassword(id: string, restaurantId: string | null, actor: JwtUser, next: string): Promise<void> {
    const user = await this.find(id, restaurantId);
    await this.authorize(actor, user, 'reset_password');
    user.passwordHash = await bcrypt.hash(next, 10);
    await this.users.save(user);
  }

  /**
   * Archives a member: they can no longer sign in and their username is free
   * again, while calls, tables and payments keep pointing at them. Refused
   * while they still serve a table that is not closed.
   */
  async archive(id: string, restaurantId: string | null, actor: JwtUser): Promise<void> {
    const user = await this.find(id, restaurantId);
    await this.authorize(actor, user, 'archive');
    if (restaurantId) {
      const busy = await this.tables.find({
        where: { restaurantId, waiterId: id, state: Not(TableState.Closed) },
        order: { name: 'ASC' },
      });
      if (busy.length) {
        throw new ConflictException({ statusCode: 409, message: 'staff_busy', tables: busy.map((t) => t.name) });
      }
    }
    user.deletedAt = new Date();
    user.active = false;
    await this.users.save(user);
    this.activeCache.delete(id);
  }

  /** Names of several members at once, archived ones included, for history and realtime payloads. */
  async names(ids: (string | null | undefined)[]): Promise<Map<string, StaffName>> {
    const unique = [...new Set(ids.filter((i): i is string => !!i && /^[0-9a-f-]{36}$/.test(i)))];
    if (!unique.length) return new Map();
    const rows = await this.users.find({
      where: { id: In(unique) },
      select: { id: true, name: true, displayName: true },
    });
    return new Map(rows.map((u) => [u.id, { name: u.name, guestName: guestFacingName(u.name, u.displayName) }]));
  }

  /** Readable name of a JWT subject, for history records. */
  async actorName(sub: string): Promise<string> {
    if (sub === 'superadmin') return 'Superadmin';
    return (await this.names([sub])).get(sub)?.name ?? 'Usuário removido';
  }

  /**
   * The JWT lasts 12 h; a deactivated or archived member loses access within
   * seconds. A short cache avoids a database read on every request.
   */
  private readonly activeCache = new Map<string, { active: boolean; until: number }>();

  async isActive(id: string): Promise<boolean> {
    const hit = this.activeCache.get(id);
    if (hit && hit.until > Date.now()) return hit.active;
    const user = await this.users.findOne({ where: { id }, select: { id: true, active: true, deletedAt: true } });
    const active = !!user?.active && !user.deletedAt;
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

  private async find(id: string, restaurantId: string | null): Promise<StaffUser> {
    const user = await this.users.findOne({ where: { id, ...notArchived } });
    if (!user || user.restaurantId !== restaurantId) throw new NotFoundException();
    return user;
  }

  private async authorize(actor: JwtUser, target: StaffUser, action: StaffAction, nextRoles?: Role[]) {
    if (!target.restaurantId) {
      // Elo team: the superadmin or whoever manages the team; nobody locks themselves out.
      if (actor.sub === target.id && action !== 'edit') throw new ForbiddenException('self');
      return;
    }
    const activeAdmins = await this.users.count({
      where: { restaurantId: target.restaurantId, active: true, roles: ArrayContains([Role.RestaurantAdmin]), ...notArchived },
    });
    const decision = staffRule(actor, target, action, { activeAdmins, nextRoles });
    if (!decision.allowed) throw new ForbiddenException(decision.why);
  }
}
