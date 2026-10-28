/** Permissões granulares do dashboard Elo Digital (equipe definida pelo superadmin). */
export const Permission = {
  Restaurants: 'restaurants',
  Subscriptions: 'subscriptions',
  AccessControl: 'access_control',
  Settings: 'settings',
  TableTokens: 'table_tokens',
  RestaurantAccess: 'restaurant_access',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];
export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);
