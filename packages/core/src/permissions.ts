/** Fine-grained permissions of the Elo Digital team (granted by the superadmin or by whoever manages the team). */
export const Permission = {
  RestaurantsView: 'restaurants.view',
  RestaurantsCreate: 'restaurants.create',
  RestaurantsEdit: 'restaurants.edit',
  RestaurantsSuspend: 'restaurants.suspend',
  RestaurantsDelete: 'restaurants.delete',
  PaymentsView: 'payments.view',
  PaymentsRecord: 'payments.record',
  RestaurantsAccess: 'restaurants.access',
  RestaurantsTables: 'restaurants.tables',
  RestaurantsActivity: 'restaurants.activity',
  TeamManage: 'team.manage',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];
export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);

export interface PermissionGroup {
  label: string;
  items: { permission: Permission; label: string; hint?: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Restaurantes',
    items: [
      { permission: Permission.RestaurantsView, label: 'Ver', hint: 'Lista, busca e detalhes.' },
      { permission: Permission.RestaurantsCreate, label: 'Cadastrar' },
      { permission: Permission.RestaurantsEdit, label: 'Editar dados', hint: 'Nome, gerente e contato.' },
      { permission: Permission.RestaurantsSuspend, label: 'Suspender e reativar' },
      { permission: Permission.RestaurantsDelete, label: 'Excluir e restaurar', hint: 'Só o superadmin concede.' },
    ],
  },
  {
    label: 'Assinaturas',
    items: [
      { permission: Permission.PaymentsView, label: 'Ver pagamentos' },
      { permission: Permission.PaymentsRecord, label: 'Registrar pagamentos' },
    ],
  },
  {
    label: 'Suporte',
    items: [
      { permission: Permission.RestaurantsAccess, label: 'Entrar no painel do restaurante' },
      { permission: Permission.RestaurantsTables, label: 'Regravar tokens de mesa' },
      { permission: Permission.RestaurantsActivity, label: 'Ver registros de atividade' },
    ],
  },
  {
    label: 'Equipe Elo',
    items: [{ permission: Permission.TeamManage, label: 'Gerenciar a equipe', hint: 'Só concede o que a própria pessoa tem.' }],
  },
];

export const PERMISSION_LABEL: Record<Permission, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.permission, `${g.label}: ${i.label}`])),
) as Record<Permission, string>;

/** Everything that acts on a restaurant needs to see it first. */
const REQUIRES: Partial<Record<Permission, Permission[]>> = {
  [Permission.RestaurantsCreate]: [Permission.RestaurantsView],
  [Permission.RestaurantsEdit]: [Permission.RestaurantsView],
  [Permission.RestaurantsSuspend]: [Permission.RestaurantsView],
  [Permission.RestaurantsDelete]: [Permission.RestaurantsView],
  [Permission.PaymentsView]: [Permission.RestaurantsView],
  [Permission.PaymentsRecord]: [Permission.RestaurantsView, Permission.PaymentsView],
  [Permission.RestaurantsAccess]: [Permission.RestaurantsView],
  [Permission.RestaurantsTables]: [Permission.RestaurantsView],
  [Permission.RestaurantsActivity]: [Permission.RestaurantsView],
};

/** Adds the permissions each chosen one depends on, deduplicated, in catalog order. */
export function withRequired(perms: readonly string[]): Permission[] {
  const set = new Set<string>(perms);
  for (const p of perms) for (const r of REQUIRES[p as Permission] ?? []) set.add(r);
  return ALL_PERMISSIONS.filter((p) => set.has(p));
}

/** Names used before the permissions were split, mapped to what they covered. */
const LEGACY: Record<string, Permission[]> = {
  restaurants: [Permission.RestaurantsView, Permission.RestaurantsCreate, Permission.RestaurantsEdit],
  subscriptions: [Permission.PaymentsView, Permission.PaymentsRecord],
  access_control: [Permission.RestaurantsSuspend],
  restaurant_access: [Permission.RestaurantsAccess],
  table_tokens: [Permission.RestaurantsTables],
  settings: [Permission.TeamManage],
};

/** Reads permissions from tokens issued before the split; current names pass through. */
export function upgradePermissions(perms: readonly string[]): Permission[] {
  return withRequired(perms.flatMap((p) => LEGACY[p] ?? [p]));
}

/**
 * A team member may only hand out permissions they hold themselves, and
 * deleting restaurants is granted by the superadmin alone.
 */
export function canGrant(actor: { superadmin: boolean; permissions: readonly string[] }, permission: Permission): boolean {
  if (actor.superadmin) return true;
  if (permission === Permission.RestaurantsDelete) return false;
  return actor.permissions.includes(permission);
}
