export const Role = {
  Superadmin: 'superadmin',
  EloAdmin: 'elo_admin',
  RestaurantAdmin: 'restaurant_admin',
  Manager: 'manager',
  Waiter: 'waiter',
  Kitchen: 'kitchen',
  Cashier: 'cashier',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const EloStaffRoles: Role[] = [Role.Superadmin, Role.EloAdmin];
export const RestaurantStaffRoles: Role[] = [
  Role.RestaurantAdmin,
  Role.Manager,
  Role.Waiter,
  Role.Kitchen,
  Role.Cashier,
];

/**
 * Who runs the restaurant day to day: menu, tables, team, reports. Only the
 * administrator also handles the restaurant's settings and subscription.
 */
export const RestaurantManagerRoles: Role[] = [Role.RestaurantAdmin, Role.Manager];

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'Superadmin',
  elo_admin: 'Equipe Elo',
  restaurant_admin: 'Titular',
  manager: 'Gerente',
  waiter: 'Garçom',
  kitchen: 'Cozinha',
  cashier: 'Caixa',
};

/** Tokens issued before multiple roles carry a single `role`. */
export function rolesOf(payload: { roles?: Role[]; role?: Role }): Role[] {
  if (Array.isArray(payload.roles)) return payload.roles;
  return payload.role ? [payload.role] : [];
}

export function hasAnyRole(roles: readonly Role[], allowed: readonly Role[]): boolean {
  return roles.some((r) => allowed.includes(r));
}
