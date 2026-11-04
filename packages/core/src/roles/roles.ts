export const Role = {
    SUPERADMIN: 'superadmin',
    ELO_ADMIN: 'elo_admin',
    RESTAURANT_ADMIN: 'restaurant_admin',
    MANAGER: 'manager',
    WAITER: 'waiter',
    KITCHEN: 'kitchen',
    CASHIER: 'cashier'
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const EloStaffRoles: Role[] = [Role.SUPERADMIN, Role.ELO_ADMIN];
export const RestaurantStaffRoles: Role[] = [
    Role.RESTAURANT_ADMIN,
    Role.MANAGER,
    Role.WAITER,
    Role.KITCHEN,
    Role.CASHIER
];

/**
 * Who runs the restaurant day to day: menu, tables, team, reports. Only the
 * administrator also handles the restaurant's settings and subscription.
 */
export const RestaurantManagerRoles: Role[] = [Role.RESTAURANT_ADMIN, Role.MANAGER];
/** Tokens issued before multiple roles carry a single `role`. */
export function rolesOf(payload: { roles?: Role[]; role?: Role }): Role[] {
    if (Array.isArray(payload.roles)) return payload.roles;
    return payload.role ? [payload.role] : [];
}

export function hasAnyRole(roles: readonly Role[], allowed: readonly Role[]): boolean {
    return roles.some((r) => allowed.includes(r));
}
