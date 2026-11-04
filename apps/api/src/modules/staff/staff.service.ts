import type { StaffAction } from '@elo/core/roles/staff-rules';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '@elo/core/roles/roles';
import {
    canTransferOwnership,
    guestFacingName,
    ownershipRoles,
    staffRule
} from '@elo/core/roles/staff-rules';
import { TableState } from '@elo/core/tables/table-state';
import bcrypt from 'bcryptjs';
import { ArrayContains, In, IsNull, Not, Repository } from 'typeorm';
import {
    BCRYPT_COST,
    SHORT_CACHE_MS,
    SUPERADMIN_NAME,
    UUID_PATTERN
} from '#/common/constants.js';
import { AuditLogService } from '#/modules/audit-logs/audit-log.service.js';
import { InvalidCredentialsException } from '#/modules/auth/exceptions/invalid-credentials.exception.js';
import { RealtimeService } from '#/modules/realtime/realtime.service.js';
import { SessionService } from '#/modules/sessions/session.service.js';
import { DiningTableEntity } from '#/modules/tables/entities/dining-table.entity.js';
import { StaffUserEntity } from './entities/staff-user.entity.js';
import { InvalidOwnerException } from './exceptions/invalid-owner.exception.js';
import { SamePasswordException } from './exceptions/same-password.exception.js';
import { StaffBusyException } from './exceptions/staff-busy.exception.js';
import { StaffNotFoundException } from './exceptions/staff-not-found.exception.js';
import { TargetIsOwnerException } from './exceptions/target-is-owner.exception.js';
import { TargetIsSelfException } from './exceptions/target-is-self.exception.js';
import { TargetNotBelowException } from './exceptions/target-not-below.exception.js';
import { UsernameTakenException } from './exceptions/username-taken.exception.js';
import { WrongPasswordException } from './exceptions/wrong-password.exception.js';
import { staffRuleException } from './utils/staff-rule-exception.js';

/** What an account may do right now, read from the database rather than from its token. */
export interface CurrentAccess {
    roles: Role[];
    permissions: string[];
}

export interface CreateStaffInput {
    restaurantId: string | null;
    username: string;
    password: string;
    name: string;
    displayName?: string | null;
    roles: Role[];
    permissions?: string[];
}

export interface UpdateStaffInput {
    name?: string | undefined;
    displayName?: string | null;
    roles?: Role[];
    /** Elo team only. */
    permissions?: string[];
}

export type PublicStaff = Omit<StaffUserEntity, 'passwordHash'>;

/** Name pair used wherever a team member is shown: full name to staff, short name to guests. */
export interface StaffName {
    name: string;
    guestName: string;
}

const strip = ({ passwordHash: _hash, ...rest }: StaffUserEntity): PublicStaff => rest;
const notArchived = { deletedAt: IsNull() };

@Injectable()
export class StaffService {
    constructor(
        @InjectRepository(StaffUserEntity)
        private readonly users: Repository<StaffUserEntity>,
        @InjectRepository(DiningTableEntity)
        private readonly tables: Repository<DiningTableEntity>,
        private readonly audit: AuditLogService,
        private readonly realtime: RealtimeService,
        private readonly sessions: SessionService
    ) {}

    public async create(data: CreateStaffInput, actor?: JwtUser): Promise<PublicStaff> {
        // The owner is created with the restaurant and only changes through a transfer; managers come from the owner.
        if (actor && data.restaurantId) {
            if (data.roles.includes(Role.RESTAURANT_ADMIN))
                throw new TargetIsOwnerException();
            if (
                data.roles.includes(Role.MANAGER) &&
                !actor.impersonatedBy &&
                !actor.roles.includes(Role.RESTAURANT_ADMIN)
            ) {
                throw new TargetNotBelowException();
            }
        }
        const scope = {
            username: data.username,
            restaurantId: data.restaurantId ?? IsNull(),
            ...notArchived
        };
        if (await this.users.findOne({ where: scope }))
            throw new UsernameTakenException('username');
        const user = await this.users.save(
            this.users.create({
                restaurantId: data.restaurantId,
                username: data.username,
                name: data.name.trim(),
                displayName: data.displayName?.trim() || null,
                passwordHash: await bcrypt.hash(data.password, BCRYPT_COST),
                roles: data.roles,
                permissions: data.permissions ?? []
            })
        );
        if (actor)
            await this.audit.record(actor, 'staff_created', user.restaurantId, {
                target: user.name,
                meta: { roles: user.roles }
            });
        return strip(user);
    }

    /** `restaurantId` null lists the Elo team. Archived accounts are left out. */
    public async list(restaurantId: string | null): Promise<PublicStaff[]> {
        const rows = await this.users.find({
            where: { restaurantId: restaurantId ?? IsNull(), ...notArchived },
            order: { name: 'ASC' }
        });
        return rows.map(strip);
    }

    public async update(
        id: string,
        restaurantId: string | null,
        actor: JwtUser,
        changes: UpdateStaffInput
    ): Promise<PublicStaff> {
        const user = await this.find(id, restaurantId);
        if (changes.roles)
            await this.authorize(actor, user, 'change_roles', changes.roles);
        else await this.authorize(actor, user, 'edit');
        const before = {
            name: user.name,
            displayName: user.displayName,
            roles: [...user.roles],
            permissions: [...user.permissions]
        };
        if (changes.name !== undefined) user.name = changes.name.trim();
        if (changes.displayName !== undefined)
            user.displayName = changes.displayName?.trim() || null;
        if (changes.roles) user.roles = changes.roles;
        if (changes.permissions && !user.restaurantId)
            user.permissions = changes.permissions;
        const saved = await this.users.save(user);
        this.activeCache.delete(id);
        const same = (a: string[], b: string[]) =>
            a.length === b.length && a.every((x) => b.includes(x));
        if (!same(before.roles, user.roles)) {
            await this.audit.record(actor, 'staff_roles_changed', user.restaurantId, {
                target: user.name,
                meta: { from: before.roles, to: user.roles }
            });
        }
        // The member's open screens fetch a token with the new roles and name; no new sign-in needed.
        if (
            user.restaurantId &&
            (!same(before.roles, user.roles) || before.name !== user.name)
        ) {
            this.realtime.publish({
                type: 'staff.updated',
                restaurantId: user.restaurantId,
                payload: { id: user.id }
            });
        }
        if (!same(before.permissions, user.permissions)) {
            await this.audit.record(actor, 'staff_updated', user.restaurantId, {
                target: user.name,
                meta: { permissions: user.permissions }
            });
        }
        if (before.name !== user.name || before.displayName !== user.displayName) {
            await this.audit.record(actor, 'staff_updated', user.restaurantId, {
                target: user.name,
                meta: before.name !== user.name ? { formerName: before.name } : undefined
            });
        }
        return strip(saved);
    }

    public async setActive(
        id: string,
        restaurantId: string | null,
        actor: JwtUser,
        active: boolean
    ): Promise<void> {
        const user = await this.find(id, restaurantId);
        if (!active) await this.authorize(actor, user, 'set_active');
        else await this.authorize(actor, user, 'edit');
        const changed = user.active !== active;
        user.active = active;
        await this.users.save(user);
        this.activeCache.delete(id);
        if (!active) this.realtime.disconnectMember(id);
        if (changed)
            await this.audit.record(
                actor,
                active ? 'staff_activated' : 'staff_deactivated',
                user.restaurantId,
                { target: user.name }
            );
    }

    /** Administrator sets a new password for a team member (there is no e-mail in the system). */
    public async resetPassword(
        id: string,
        restaurantId: string | null,
        actor: JwtUser,
        next: string
    ): Promise<void> {
        const user = await this.find(id, restaurantId);
        await this.authorize(actor, user, 'reset_password');
        user.passwordHash = await bcrypt.hash(next, BCRYPT_COST);
        await this.users.save(user);
        // Every session of the member ended with the old password.
        await this.sessions.keepAfterPasswordChange(undefined, user.passwordHash);
        this.realtime.disconnectMember(id);
        await this.audit.record(actor, 'staff_password_reset', user.restaurantId, {
            target: user.name
        });
    }

    /**
     * Archives a member: they can no longer sign in and their username is free
     * again, while calls, tables and payments keep pointing at them. Refused
     * while they still serve a table that is not closed.
     */
    public async archive(
        id: string,
        restaurantId: string | null,
        actor: JwtUser
    ): Promise<void> {
        const user = await this.find(id, restaurantId);
        await this.authorize(actor, user, 'archive');
        if (restaurantId) {
            const busy = await this.tables.find({
                where: { restaurantId, waiterId: id, state: Not(TableState.CLOSED) },
                order: { name: 'ASC' }
            });
            if (busy.length) {
                throw new StaffBusyException({ tables: busy.map((t) => t.name) });
            }
        }
        user.deletedAt = new Date();
        user.active = false;
        await this.users.save(user);
        this.activeCache.delete(id);
        this.realtime.disconnectMember(id);
        await this.audit.record(actor, 'staff_archived', user.restaurantId, {
            target: user.name
        });
    }

    /** Names of several members at once, archived ones included, for history and realtime payloads. */
    public async names(
        ids: (string | null | undefined)[]
    ): Promise<Map<string, StaffName>> {
        const unique = [
            ...new Set(ids.filter((i): i is string => !!i && UUID_PATTERN.test(i)))
        ];
        if (!unique.length) return new Map();
        const rows = await this.users.find({
            where: { id: In(unique) },
            select: { id: true, name: true, displayName: true }
        });
        return new Map(
            rows.map((u) => [
                u.id,
                { name: u.name, guestName: guestFacingName(u.name, u.displayName) }
            ])
        );
    }

    public async profiles(
        ids: string[]
    ): Promise<Pick<StaffUserEntity, 'id' | 'name' | 'avatarUrl'>[]> {
        return ids.length
            ? this.users.find({
                  where: { id: In(ids) },
                  select: { id: true, name: true, avatarUrl: true }
              })
            : [];
    }

    /** Readable name of a JWT subject, for history records. */
    public async actorName(sub: string): Promise<string | null> {
        if (sub === 'superadmin') return SUPERADMIN_NAME;
        return (await this.names([sub])).get(sub)?.name ?? null;
    }

    /**
     * The JWT lasts 12 h, but what it grants follows the account: a deactivated or
     * archived member loses access, and changed roles or permissions apply, within
     * seconds. A short cache avoids a database read on every request.
     */
    private readonly activeCache = new Map<
        string,
        { access: CurrentAccess | null; until: number }
    >();

    public async access(id: string): Promise<CurrentAccess | null> {
        const hit = this.activeCache.get(id);
        if (hit && hit.until > Date.now()) return hit.access;
        const user = await this.users.findOne({
            where: { id },
            select: {
                id: true,
                active: true,
                deletedAt: true,
                roles: true,
                permissions: true
            }
        });
        const access =
            user?.active && !user.deletedAt
                ? { roles: user.roles, permissions: user.permissions }
                : null;
        this.activeCache.set(id, { access, until: Date.now() + SHORT_CACHE_MS });
        return access;
    }

    public async isActive(id: string): Promise<boolean> {
        return !!(await this.access(id));
    }

    /**
     * Hands the restaurant to another member: the owner confirms with their
     * password, Elo support gives a reason. The former owner stays on the team
     * as a manager, and both get their new roles live.
     */
    public async transferOwnership(
        restaurantId: string,
        toId: string,
        actor: JwtUser,
        confirm: { password: string } | { reason: string }
    ): Promise<void> {
        const target = await this.find(toId, restaurantId);
        const owner = await this.users.findOne({
            where: {
                restaurantId,
                roles: ArrayContains([Role.RESTAURANT_ADMIN]),
                ...notArchived
            }
        });
        if (
            'password' in confirm &&
            (!owner ||
                owner.id !== actor.sub ||
                !(await bcrypt.compare(confirm.password, owner.passwordHash)))
        ) {
            throw new WrongPasswordException();
        }
        const from = owner ?? { id: '', roles: [] };
        if (!canTransferOwnership(from, { ...target, archived: !!target.deletedAt }))
            throw new InvalidOwnerException();
        await this.users.manager.transaction(async (tx) => {
            if (owner)
                await tx.update(StaffUserEntity, owner.id, {
                    roles: ownershipRoles(owner.roles, 'former')
                });
            await tx.update(StaffUserEntity, target.id, {
                roles: ownershipRoles(target.roles, 'owner')
            });
        });
        for (const u of [owner, target]) {
            if (!u) continue;
            this.activeCache.delete(u.id);
            this.realtime.publish({
                type: 'staff.updated',
                restaurantId,
                payload: { id: u.id }
            });
        }
        await this.audit.record(actor, 'ownership_transferred', restaurantId, {
            target: target.name,
            meta: {
                formerOwner: owner?.name ?? null,
                ...('reason' in confirm ? { reason: confirm.reason } : {})
            }
        });
    }

    /**
     * Sets or clears a profile photo and returns the previous URL, so the caller can
     * delete the old file. Members change their own; leads follow the usual team rules.
     */
    public async setAvatar(
        id: string,
        restaurantId: string,
        actor: JwtUser,
        url: string | null
    ): Promise<string | null> {
        const user = await this.find(id, restaurantId);
        if (actor.sub !== id) await this.authorize(actor, user, 'edit');
        const previous = user.avatarUrl;
        user.avatarUrl = url;
        await this.users.save(user);
        this.realtime.publish({ type: 'staff.updated', restaurantId, payload: { id } });
        return previous;
    }

    /** Own password change: the other signed-in devices are signed out, this one stays. */
    public async changePassword(
        id: string,
        current: string,
        next: string,
        sessionId?: string
    ): Promise<void> {
        const user = await this.users.findOne({ where: { id } });
        if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
            throw new InvalidCredentialsException();
        }
        if (current === next) throw new SamePasswordException();
        user.passwordHash = await bcrypt.hash(next, BCRYPT_COST);
        await this.users.save(user);
        await this.sessions.keepAfterPasswordChange(sessionId, user.passwordHash);
        // Live feeds of the other devices drop now; this one reconnects with its still valid token.
        this.realtime.disconnectMember(id);
    }

    private async find(
        id: string,
        restaurantId: string | null
    ): Promise<StaffUserEntity> {
        const user = await this.users.findOne({ where: { id, ...notArchived } });
        if (!user || user.restaurantId !== restaurantId)
            throw new StaffNotFoundException();
        return user;
    }

    private async authorize(
        actor: JwtUser,
        target: StaffUserEntity,
        action: StaffAction,
        nextRoles?: Role[] | undefined
    ) {
        if (!target.restaurantId) {
            // Elo team: the superadmin or whoever manages the team; nobody locks themselves out.
            if (actor.sub === target.id && action !== 'edit')
                throw new TargetIsSelfException();
            return;
        }
        const decision = staffRule(actor, target, action, { nextRoles });
        if (!decision.allowed) throw staffRuleException(decision.why);
    }
}
