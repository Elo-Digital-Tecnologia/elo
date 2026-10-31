import { Role } from './roles';

export interface StaffActor {
  sub: string;
  roles: readonly Role[];
  /** Elo support acting inside the restaurant panel is not bound by the admin-vs-admin rule. */
  impersonatedBy?: string;
}

export interface StaffTarget {
  id: string;
  roles: readonly Role[];
}

export type StaffAction = 'edit' | 'change_roles' | 'reset_password' | 'set_active' | 'archive';

export type StaffDecision = { allowed: true } | { allowed: false; why: 'owner' | 'not_above' | 'self' };

/**
 * Who may change a restaurant team member. Each restaurant has exactly one
 * administrator, the owner: the role only moves through an ownership transfer,
 * the owner is never archived or deactivated, and nobody but the owner
 * themselves (or Elo support) edits the owner. A manager only changes waiters,
 * kitchen and cashier and never hands out the manager role. Nobody archives,
 * deactivates or changes the roles of their own account.
 */
export function staffRule(actor: StaffActor, target: StaffTarget, action: StaffAction, ctx: { nextRoles?: Role[] } = {}): StaffDecision {
  const self = actor.sub === target.id;
  if (self && action !== 'edit') return { allowed: false, why: 'self' };
  const targetIsOwner = target.roles.includes(Role.RestaurantAdmin);
  const actorIsOwner = actor.roles.includes(Role.RestaurantAdmin) || !!actor.impersonatedBy;
  const leads = (roles: readonly Role[]) => roles.includes(Role.RestaurantAdmin) || roles.includes(Role.Manager);
  if (!actorIsOwner && ((!self && leads(target.roles)) || (action === 'change_roles' && leads(ctx.nextRoles ?? [])))) {
    return { allowed: false, why: 'not_above' };
  }
  if (targetIsOwner && (action === 'archive' || action === 'set_active')) return { allowed: false, why: 'owner' };
  if (action === 'change_roles' && targetIsOwner !== !!ctx.nextRoles?.includes(Role.RestaurantAdmin)) return { allowed: false, why: 'owner' };
  return { allowed: true };
}

/** Whether `target` may receive the ownership of the restaurant from its current owner. */
export function canTransferOwnership(owner: StaffTarget, target: StaffTarget & { active: boolean; archived: boolean }): boolean {
  return owner.id !== target.id && target.active && !target.archived && !target.roles.includes(Role.RestaurantAdmin);
}

/** Roles after an ownership transfer: the new owner leaves the manager role behind, the former owner becomes a manager. */
export function ownershipRoles(roles: readonly Role[], becomes: 'owner' | 'former'): Role[] {
  const rest = roles.filter((r) => r !== Role.RestaurantAdmin && r !== Role.Manager);
  return becomes === 'owner' ? [Role.RestaurantAdmin, ...rest] : [Role.Manager, ...rest];
}

/** Name shown to guests: the chosen display name, else the first name. */
export function guestFacingName(name: string, displayName?: string | null): string {
  return displayName?.trim() || name.trim().split(/\s+/)[0];
}
