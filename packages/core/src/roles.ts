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
