/** Kinds of activity recorded for a restaurant and shown in its activity log. */
export const ACTIVITY_CATEGORIES = [
    'tables',
    'orders',
    'team',
    'payments',
    'settings',
    'restaurant',
    'support'
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

/** Every recorded action and the category it is listed under. */
export const ACTIVITY_ACTIONS = {
    table_created: 'tables',
    table_removed: 'tables',
    table_token_rotated: 'tables',
    table_taken: 'tables',
    order_cancelled: 'orders',
    order_returned: 'orders',
    staff_created: 'team',
    staff_updated: 'team',
    staff_roles_changed: 'team',
    staff_password_reset: 'team',
    staff_activated: 'team',
    staff_deactivated: 'team',
    staff_archived: 'team',
    ownership_transferred: 'team',
    payment_recorded: 'payments',
    payment_edited: 'payments',
    payment_voided: 'payments',
    due_date_adjusted: 'payments',
    plan_changed: 'payments',
    trial_ended: 'payments',
    contract_registered: 'restaurant',
    contract_converted: 'restaurant',
    contract_renewed: 'restaurant',
    contract_voided: 'restaurant',
    settings_updated: 'settings',
    slug_changed: 'settings',
    pause_created: 'settings',
    pause_ended: 'settings',
    opening_created: 'settings',
    opening_ended: 'settings',
    restaurant_edited: 'restaurant',
    restaurant_suspended: 'restaurant',
    restaurant_reactivated: 'restaurant',
    restaurant_deleted: 'restaurant',
    restaurant_restored: 'restaurant',
    restaurant_purged: 'restaurant',
    restaurant_access: 'support'
} as const satisfies Record<string, ActivityCategory>;
export type ActivityAction = keyof typeof ACTIVITY_ACTIONS;

export const actionsIn = (category: ActivityCategory): ActivityAction[] =>
    (Object.keys(ACTIVITY_ACTIONS) as ActivityAction[]).filter(
        (a) => ACTIVITY_ACTIONS[a] === category
    );

export type ActorKind = 'staff' | 'elo' | 'system';

export interface ActivityView {
    id: string;
    action: ActivityAction;
    /** Null when the actor has no name of their own (the system, a removed account). */
    actorName: string | null;
    actorKind: ActorKind;
    /** What the action was about: a table, a person, an order's table. */
    target: string | null;
    meta: Record<string, unknown> | null;
    createdAt: string;
}

export interface ActivityPage {
    items: ActivityView[];
    total: number;
    page: number;
    pageSize: number;
}
