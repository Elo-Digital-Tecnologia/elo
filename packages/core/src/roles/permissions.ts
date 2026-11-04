/** Fine-grained permissions of the Elo Digital team (granted by the superadmin or by whoever manages the team). */
export const Permission = {
    RESTAURANTS_VIEW: 'restaurants.view',
    RESTAURANTS_CREATE: 'restaurants.create',
    RESTAURANTS_EDIT: 'restaurants.edit',
    RESTAURANTS_SUSPEND: 'restaurants.suspend',
    RESTAURANTS_DELETE: 'restaurants.delete',
    RESTAURANTS_OWNER: 'restaurants.owner',
    CONTRACTS_MANAGE: 'contracts.manage',
    PAYMENTS_VIEW: 'payments.view',
    PAYMENTS_RECORD: 'payments.record',
    PLANS_MANAGE: 'plans.manage',
    RESTAURANTS_ACCESS: 'restaurants.access',
    RESTAURANTS_TABLES: 'restaurants.tables',
    RESTAURANTS_ACTIVITY: 'restaurants.activity',
    TEAM_MANAGE: 'team.manage'
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];
export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);

export interface PermissionGroup {
    key: 'restaurants' | 'billing' | 'support' | 'team';
    permissions: Permission[];
}

/** How the permissions are grouped when granting them. */
export const PERMISSION_GROUPS: PermissionGroup[] = [
    {
        key: 'restaurants',
        permissions: [
            Permission.RESTAURANTS_VIEW,
            Permission.RESTAURANTS_CREATE,
            Permission.RESTAURANTS_EDIT,
            Permission.RESTAURANTS_SUSPEND,
            Permission.CONTRACTS_MANAGE,
            Permission.RESTAURANTS_OWNER,
            Permission.RESTAURANTS_DELETE
        ]
    },
    {
        key: 'billing',
        permissions: [
            Permission.PAYMENTS_VIEW,
            Permission.PAYMENTS_RECORD,
            Permission.PLANS_MANAGE
        ]
    },
    {
        key: 'support',
        permissions: [
            Permission.RESTAURANTS_ACCESS,
            Permission.RESTAURANTS_TABLES,
            Permission.RESTAURANTS_ACTIVITY
        ]
    },
    {
        key: 'team',
        permissions: [Permission.TEAM_MANAGE]
    }
];

/** Everything that acts on a restaurant needs to see it first. */
const REQUIRES: Partial<Record<Permission, Permission[]>> = {
    [Permission.RESTAURANTS_CREATE]: [Permission.RESTAURANTS_VIEW],
    [Permission.RESTAURANTS_EDIT]: [Permission.RESTAURANTS_VIEW],
    [Permission.RESTAURANTS_SUSPEND]: [Permission.RESTAURANTS_VIEW],
    [Permission.RESTAURANTS_DELETE]: [Permission.RESTAURANTS_VIEW],
    [Permission.RESTAURANTS_OWNER]: [Permission.RESTAURANTS_VIEW],
    [Permission.CONTRACTS_MANAGE]: [Permission.RESTAURANTS_VIEW],
    [Permission.PAYMENTS_VIEW]: [Permission.RESTAURANTS_VIEW],
    [Permission.PAYMENTS_RECORD]: [Permission.RESTAURANTS_VIEW, Permission.PAYMENTS_VIEW],
    [Permission.PLANS_MANAGE]: [Permission.RESTAURANTS_VIEW, Permission.PAYMENTS_VIEW],
    [Permission.RESTAURANTS_ACCESS]: [Permission.RESTAURANTS_VIEW],
    [Permission.RESTAURANTS_TABLES]: [Permission.RESTAURANTS_VIEW],
    [Permission.RESTAURANTS_ACTIVITY]: [Permission.RESTAURANTS_VIEW]
};

/** Adds the permissions each chosen one depends on, deduplicated, in catalog order. */
export function withRequired(perms: readonly string[]): Permission[] {
    const set = new Set<string>(perms);
    for (const p of perms) for (const r of REQUIRES[p as Permission] ?? []) set.add(r);
    return ALL_PERMISSIONS.filter((p) => set.has(p));
}

/** Names used before the permissions were split, mapped to what they covered. */
const LEGACY: Record<string, Permission[]> = {
    restaurants: [
        Permission.RESTAURANTS_VIEW,
        Permission.RESTAURANTS_CREATE,
        Permission.RESTAURANTS_EDIT
    ],
    subscriptions: [Permission.PAYMENTS_VIEW, Permission.PAYMENTS_RECORD],
    access_control: [Permission.RESTAURANTS_SUSPEND],
    restaurant_access: [Permission.RESTAURANTS_ACCESS],
    table_tokens: [Permission.RESTAURANTS_TABLES],
    settings: [Permission.TEAM_MANAGE]
};

/** Reads permissions from tokens issued before the split; current names pass through. */
export function upgradePermissions(perms: readonly string[]): Permission[] {
    return withRequired(perms.flatMap((p) => LEGACY[p] ?? [p]));
}

/**
 * A team member may only hand out permissions they hold themselves, and
 * deleting restaurants is granted by the superadmin alone.
 */
export function canGrant(
    actor: { superadmin: boolean; permissions: readonly string[] },
    permission: Permission
): boolean {
    if (actor.superadmin) return true;
    if (permission === Permission.RESTAURANTS_DELETE) return false;
    return actor.permissions.includes(permission);
}
