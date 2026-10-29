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

export type StaffDecision = { allowed: true } | { allowed: false; why: 'other_admin' | 'self' | 'last_admin' };

/**
 * Who may change a restaurant team member. An administrator never changes
 * another administrator, nobody archives, deactivates or changes the roles of
 * their own account, and the restaurant always keeps at least one active
 * administrator.
 */
export function staffRule(
  actor: StaffActor,
  target: StaffTarget,
  action: StaffAction,
  ctx: { activeAdmins: number; nextRoles?: Role[] } = { activeAdmins: 1 },
): StaffDecision {
  const self = actor.sub === target.id;
  const targetIsAdmin = target.roles.includes(Role.RestaurantAdmin);
  if (self && action !== 'edit') return { allowed: false, why: 'self' };
  if (!self && targetIsAdmin && !actor.impersonatedBy) return { allowed: false, why: 'other_admin' };
  const losesAdmin =
    targetIsAdmin &&
    (action === 'archive' || action === 'set_active' || (action === 'change_roles' && !ctx.nextRoles?.includes(Role.RestaurantAdmin)));
  if (losesAdmin && ctx.activeAdmins <= 1) return { allowed: false, why: 'last_admin' };
  return { allowed: true };
}

/** Name shown to guests: the chosen display name, else the first name. */
export function guestFacingName(name: string, displayName?: string | null): string {
  return displayName?.trim() || name.trim().split(/\s+/)[0];
}
