export const Role = {
  Superadmin: 'superadmin',
  EloAdmin: 'elo_admin',
  RestaurantAdmin: 'restaurant_admin',
  Waiter: 'waiter',
  Kitchen: 'kitchen',
  Cashier: 'cashier',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const EloStaffRoles: Role[] = [Role.Superadmin, Role.EloAdmin];
export const RestaurantStaffRoles: Role[] = [
  Role.RestaurantAdmin,
  Role.Waiter,
  Role.Kitchen,
  Role.Cashier,
];

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'Superadmin',
  elo_admin: 'Equipe Elo',
  restaurant_admin: 'Administrador',
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
