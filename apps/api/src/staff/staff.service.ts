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
import { canTransferOwnership, guestFacingName, ownershipRoles, Role, type StaffAction, staffRule, TableState } from '@elo/core';
import type { JwtUser } from '../common/auth-types';
import { AuditService } from '../audit/audit.service';
import { DiningTable, StaffUser } from '../database/entities';
import { RealtimeService } from '../realtime/realtime.service';

/** What an account may do right now, read from the database rather than from its token. */
export interface CurrentAccess {
  roles: Role[];
  permissions: string[];
}

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
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(data: NewStaff, actor?: JwtUser): Promise<PublicStaff> {
    // The owner is created with the restaurant and only changes through a transfer; managers come from the owner.
    if (actor && data.restaurantId) {
      if (data.roles.includes(Role.RestaurantAdmin)) throw new ForbiddenException('owner');
      if (data.roles.includes(Role.Manager) && !actor.impersonatedBy && !actor.roles.includes(Role.RestaurantAdmin)) {
        throw new ForbiddenException('not_above');
      }
    }
    const scope = { username: data.username, restaurantId: data.restaurantId ?? IsNull(), ...notArchived };
    if (await this.users.findOne({ where: scope })) throw new ConflictException({ statusCode: 409, message: 'username_taken', field: 'username' });
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
    if (actor) await this.audit.record(actor, 'staff_created', user.restaurantId, { target: user.name, meta: { roles: user.roles } });
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
    const before = { name: user.name, displayName: user.displayName, roles: [...user.roles], permissions: [...user.permissions] };
    if (changes.name !== undefined) user.name = changes.name.trim();
    if (changes.displayName !== undefined) user.displayName = changes.displayName?.trim() || null;
    if (changes.roles) user.roles = changes.roles;
    if (changes.permissions && !user.restaurantId) user.permissions = changes.permissions;
    const saved = await this.users.save(user);
    this.activeCache.delete(id);
    const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
    if (!same(before.roles, user.roles)) {
      await this.audit.record(actor, 'staff_roles_changed', user.restaurantId, { target: user.name, meta: { from: before.roles, to: user.roles } });
    }
    // The member's open screens fetch a token with the new roles and name; no new sign-in needed.
    if (user.restaurantId && (!same(before.roles, user.roles) || before.name !== user.name)) {
      this.realtime.publish({ type: 'staff.updated', restaurantId: user.restaurantId, payload: { id: user.id } });
    }
    if (!same(before.permissions, user.permissions)) {
      await this.audit.record(actor, 'staff_updated', user.restaurantId, { target: user.name, meta: { permissions: user.permissions } });
    }
    if (before.name !== user.name || before.displayName !== user.displayName) {
      await this.audit.record(actor, 'staff_updated', user.restaurantId, { target: user.name, meta: before.name !== user.name ? { formerName: before.name } : undefined });
    }
    return strip(saved);
  }

  async setActive(id: string, restaurantId: string | null, actor: JwtUser, active: boolean): Promise<void> {
    const user = await this.find(id, restaurantId);
    if (!active) await this.authorize(actor, user, 'set_active');
    else await this.authorize(actor, user, 'edit');
    const changed = user.active !== active;
    user.active = active;
    await this.users.save(user);
    this.activeCache.delete(id);
    if (!active) this.realtime.disconnectMember(id);
    if (changed) await this.audit.record(actor, active ? 'staff_activated' : 'staff_deactivated', user.restaurantId, { target: user.name });
  }

  /** Administrator sets a new password for a team member (there is no e-mail in the system). */
  async resetPassword(id: string, restaurantId: string | null, actor: JwtUser, next: string): Promise<void> {
    const user = await this.find(id, restaurantId);
    await this.authorize(actor, user, 'reset_password');
    user.passwordHash = await bcrypt.hash(next, 10);
    await this.users.save(user);
    await this.audit.record(actor, 'staff_password_reset', user.restaurantId, { target: user.name });
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
    this.realtime.disconnectMember(id);
    await this.audit.record(actor, 'staff_archived', user.restaurantId, { target: user.name });
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

  async profiles(ids: string[]): Promise<Pick<StaffUser, 'id' | 'name' | 'avatarUrl'>[]> {
    return ids.length ? this.users.find({ where: { id: In(ids) }, select: { id: true, name: true, avatarUrl: true } }) : [];
  }

  /** Readable name of a JWT subject, for history records. */
  async actorName(sub: string): Promise<string> {
    if (sub === 'superadmin') return 'Superadmin';
    return (await this.names([sub])).get(sub)?.name ?? 'Usuário removido';
  }

  /**
   * The JWT lasts 12 h, but what it grants follows the account: a deactivated or
   * archived member loses access, and changed roles or permissions apply, within
   * seconds. A short cache avoids a database read on every request.
   */
  private readonly activeCache = new Map<string, { access: CurrentAccess | null; until: number }>();

  async access(id: string): Promise<CurrentAccess | null> {
    const hit = this.activeCache.get(id);
    if (hit && hit.until > Date.now()) return hit.access;
    const user = await this.users.findOne({ where: { id }, select: { id: true, active: true, deletedAt: true, roles: true, permissions: true } });
    const access = user?.active && !user.deletedAt ? { roles: user.roles, permissions: user.permissions } : null;
    this.activeCache.set(id, { access, until: Date.now() + 10_000 });
    return access;
  }

  async isActive(id: string): Promise<boolean> {
    return !!(await this.access(id));
  }

  /**
   * Hands the restaurant to another member: the owner confirms with their
   * password, Elo support gives a reason. The former owner stays on the team
   * as a manager, and both get their new roles live.
   */
  async transferOwnership(
    restaurantId: string,
    toId: string,
    actor: JwtUser,
    confirm: { password: string } | { reason: string },
  ): Promise<void> {
    const target = await this.find(toId, restaurantId);
    const owner = await this.users.findOne({ where: { restaurantId, roles: ArrayContains([Role.RestaurantAdmin]), ...notArchived } });
    if ('password' in confirm && (!owner || owner.id !== actor.sub || !(await bcrypt.compare(confirm.password, owner.passwordHash)))) {
      throw new ForbiddenException('wrong_password');
    }
    const from = owner ?? { id: '', roles: [] };
    if (!canTransferOwnership(from, { ...target, archived: !!target.deletedAt })) throw new ConflictException('invalid_owner');
    await this.users.manager.transaction(async (tx) => {
      if (owner) await tx.update(StaffUser, owner.id, { roles: ownershipRoles(owner.roles, 'former') });
      await tx.update(StaffUser, target.id, { roles: ownershipRoles(target.roles, 'owner') });
    });
    for (const u of [owner, target]) {
      if (!u) continue;
      this.activeCache.delete(u.id);
      this.realtime.publish({ type: 'staff.updated', restaurantId, payload: { id: u.id } });
    }
    await this.audit.record(actor, 'ownership_transferred', restaurantId, {
      target: target.name,
      meta: { formerOwner: owner?.name ?? null, ...('reason' in confirm ? { reason: confirm.reason } : {}) },
    });
  }

  /**
   * Sets or clears a profile photo and returns the previous URL, so the caller can
   * delete the old file. Members change their own; leads follow the usual team rules.
   */
  async setAvatar(id: string, restaurantId: string, actor: JwtUser, url: string | null): Promise<string | null> {
    const user = await this.find(id, restaurantId);
    if (actor.sub !== id) await this.authorize(actor, user, 'edit');
    const previous = user.avatarUrl;
    user.avatarUrl = url;
    await this.users.save(user);
    this.realtime.publish({ type: 'staff.updated', restaurantId, payload: { id } });
    return previous;
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
    const decision = staffRule(actor, target, action, { nextRoles });
    if (!decision.allowed) throw new ForbiddenException(decision.why);
  }
}
