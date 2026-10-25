// RBAC — Role-Based Access Control
// Elo Digital permission system

import type { UserRole, Permission } from '../types';

// ============================================
// Role Hierarchy
// ============================================

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  superadmin: 100,
  admin_elo: 80,
  admin_restaurant: 60,
  cashier: 40,
  waiter: 30,
  kitchen: 20
};

// Higher number = more permissions
export function roleHasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// ============================================
// Role Permissions Matrix
// ============================================

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  superadmin: [
    // Full system access
    'restaurant:create', 'restaurant:read', 'restaurant:update', 'restaurant:delete', 'restaurant:manage_subscription',
    'user:create', 'user:read', 'user:update', 'user:delete', 'user:manage_roles',
    'menu:create', 'menu:read', 'menu:update', 'menu:delete', 'menu:manage_availability',
    'order:create', 'order:read', 'order:update', 'order:cancel', 'order:manage_status',
    'kitchen:read', 'kitchen:update_status',
    'waiter:read_calls', 'waiter:respond_calls', 'waiter:validate_open', 'waiter:close_table',
    'billing:read', 'billing:calculate', 'billing:split', 'billing:apply_charges', 'billing:close',
    'reports:read',
    'system:manage_admins', 'system:view_logs'
  ],
  admin_elo: [
    // Platform administration (no system:manage_admins)
    'restaurant:create', 'restaurant:read', 'restaurant:update', 'restaurant:delete', 'restaurant:manage_subscription',
    'user:create', 'user:read', 'user:update', 'user:delete', 'user:manage_roles',
    'menu:read',
    'order:read',
    'billing:read',
    'reports:read',
    'system:view_logs'
  ],
  admin_restaurant: [
    // Restaurant owner/manager
    'restaurant:read', 'restaurant:update',
    'user:create', 'user:read', 'user:update', 'user:delete',
    'menu:create', 'menu:read', 'menu:update', 'menu:delete', 'menu:manage_availability',
    'order:create', 'order:read', 'order:update', 'order:cancel', 'order:manage_status',
    'kitchen:read',
    'waiter:read_calls', 'waiter:respond_calls', 'waiter:validate_open', 'waiter:close_table',
    'billing:read', 'billing:calculate', 'billing:split', 'billing:apply_charges', 'billing:close',
    'reports:read'
  ],
  waiter: [
    'order:read',
    'waiter:read_calls', 'waiter:respond_calls', 'waiter:validate_open', 'waiter:close_table',
    'billing:read', 'billing:calculate', 'billing:close'
  ],
  kitchen: [
    'kitchen:read', 'kitchen:update_status',
    'order:read'
  ],
  cashier: [
    'order:read',
    'billing:read', 'billing:calculate', 'billing:split', 'billing:apply_charges', 'billing:close',
    'reports:read'
  ]
};

// ============================================
// Permission Helpers
// ============================================

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = getPermissionsForRole(role);
  return permissions.some(p => rolePermissions.includes(p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = getPermissionsForRole(role);
  return permissions.every(p => rolePermissions.includes(p));
}

export function filterAllowedPermissions(role: UserRole, permissions: Permission[]): Permission[] {
  const rolePermissions = getPermissionsForRole(role);
  return permissions.filter(p => rolePermissions.includes(p));
}

// ============================================
// Resource-Based Access Control
// ============================================

export interface ResourceAccessContext {
  userId: string;
  userRole: UserRole;
  userRestaurantId?: string;
  resourceRestaurantId?: string;
  resourceOwnerId?: string;
}

export function canAccessResource(context: ResourceAccessContext, action: 'read' | 'update' | 'delete'): boolean {
  const { userRole, userRestaurantId, resourceRestaurantId, userId, resourceOwnerId } = context;

  // Superadmin and admin_elo can access everything
  if (roleHasPermission(userRole, 'admin_elo')) return true;

  // Check restaurant isolation
  if (userRestaurantId && resourceRestaurantId && userRestaurantId !== resourceRestaurantId) {
    return false;
  }

  // Check ownership for update/delete
  if ((action === 'update' || action === 'delete') && resourceOwnerId && userId !== resourceOwnerId) {
    // Allow if user is admin_restaurant of same restaurant
    if (userRole === 'admin_restaurant' && userRestaurantId === resourceRestaurantId) return true;
    return false;
  }

  return true;
}

// ============================================
// Route Guards
// ============================================

export interface RouteGuardConfig {
  requiredRole?: UserRole;
  requiredPermissions?: Permission[];
  requiredAnyPermission?: Permission[];
  allowPublic?: boolean;
}

export function checkRouteAccess(
  userRole: UserRole,
  config: RouteGuardConfig
): { allowed: boolean; reason?: string } {
  // Public routes
  if (config.allowPublic) return { allowed: true };

  // Role check
  if (config.requiredRole && !roleHasPermission(userRole, config.requiredRole)) {
    return { allowed: false, reason: `Requer role: ${config.requiredRole}` };
  }

  // Permission checks
  if (config.requiredPermissions) {
    const missing = config.requiredPermissions.filter(p => !hasPermission(userRole, p));
    if (missing.length > 0) {
      return { allowed: false, reason: `Permissões faltando: ${missing.join(', ')}` };
    }
  }

  if (config.requiredAnyPermission) {
    if (!hasAnyPermission(userRole, config.requiredAnyPermission)) {
      return { allowed: false, reason: `Requer uma das permissões: ${config.requiredAnyPermission.join(', ')}` };
    }
  }

  return { allowed: true };
}

// ============================================
// Route Configurations
// ============================================

export const ROUTE_PERMISSIONS: Record<string, RouteGuardConfig> = {
  // Admin routes
  '/admin': { requiredRole: 'admin_elo' },
  '/admin/restaurants': { requiredRole: 'admin_elo' },
  '/admin/subscriptions': { requiredRole: 'admin_elo' },
  '/admin/users': { requiredRole: 'admin_elo' },
  '/admin/settings': { requiredRole: 'admin_elo' },

  // Restaurant admin routes
  '/restaurant': { requiredRole: 'admin_restaurant' },
  '/restaurant/menu': { requiredRole: 'admin_restaurant' },
  '/restaurant/orders': { requiredRole: 'admin_restaurant' },
  '/restaurant/tables': { requiredRole: 'admin_restaurant' },
  '/restaurant/reports': { requiredRole: 'admin_restaurant' },
  '/restaurant/settings': { requiredRole: 'admin_restaurant' },
  '/restaurant/subscription': { requiredRole: 'admin_restaurant' },

  // Waiter routes
  '/waiter': { requiredRole: 'waiter' },
  '/waiter/calls': { requiredRole: 'waiter' },
  '/waiter/tables': { requiredRole: 'waiter' },

  // Kitchen routes
  '/kitchen': { requiredRole: 'kitchen' },

  // Cashier routes
  '/cashier': { requiredRole: 'cashier' },
  '/cashier/billing': { requiredRole: 'cashier' },

  // Public routes
  '/menu/*': { allowPublic: true },
  '/login': { allowPublic: true },
  '/register': { allowPublic: true }
};

// ============================================
// Permission Display Names
// ============================================

export const PERMISSION_LABELS: Record<Permission, string> = {
  'restaurant:create': 'Criar restaurante',
  'restaurant:read': 'Ver restaurantes',
  'restaurant:update': 'Editar restaurante',
  'restaurant:delete': 'Excluir restaurante',
  'restaurant:manage_subscription': 'Gerenciar assinatura',
  'user:create': 'Criar usuário',
  'user:read': 'Ver usuários',
  'user:update': 'Editar usuário',
  'user:delete': 'Excluir usuário',
  'user:manage_roles': 'Gerenciar papéis',
  'menu:create': 'Criar item do cardápio',
  'menu:read': 'Ver cardápio',
  'menu:update': 'Editar item do cardápio',
  'menu:delete': 'Excluir item do cardápio',
  'menu:manage_availability': 'Gerenciar disponibilidade',
  'order:create': 'Criar pedido',
  'order:read': 'Ver pedidos',
  'order:update': 'Editar pedido',
  'order:cancel': 'Cancelar pedido',
  'order:manage_status': 'Gerenciar status do pedido',
  'kitchen:read': 'Ver cozinha',
  'kitchen:update_status': 'Atualizar status na cozinha',
  'waiter:read_calls': 'Ver chamados',
  'waiter:respond_calls': 'Responder chamados',
  'waiter:validate_open': 'Validar abertura de mesa',
  'waiter:close_table': 'Fechar mesa',
  'billing:read': 'Ver contas',
  'billing:calculate': 'Calcular conta',
  'billing:split': 'Dividir conta',
  'billing:apply_charges': 'Aplicar taxas',
  'billing:close': 'Fechar conta',
  'reports:read': 'Ver relatórios',
  'system:manage_admins': 'Gerenciar administradores',
  'system:view_logs': 'Ver logs do sistema'
};

// ============================================
// Role Display Names
// ============================================

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Administrador',
  admin_elo: 'Administrador Elo Digital',
  admin_restaurant: 'Administrador do Restaurante',
  waiter: 'Garçom',
  kitchen: 'Cozinha',
  cashier: 'Caixa'
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  superadmin: 'Acesso total ao sistema, incluindo gerenciamento de administradores',
  admin_elo: 'Gerencia a plataforma Elo Digital, restaurantes e assinaturas',
  admin_restaurant: 'Gerencia o restaurante, cardápio, equipe e operações',
  waiter: 'Atende mesas, valida aberturas e fecha contas',
  kitchen: 'Prepara pedidos e atualiza status na cozinha',
  cashier: 'Calcula e fecha contas, aplica taxas e descontos'
};