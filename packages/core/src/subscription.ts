export const GRACE_DAYS = 7;

export const AccessState = {
    Active: 'active',
    Grace: 'grace',
    Suspended: 'suspended'
} as const;
export type AccessState = (typeof AccessState)[keyof typeof AccessState];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Estado de acesso do restaurante. `dueDate` é o vencimento; até `GRACE_DAYS`
 * dias depois o sistema funciona com aviso; após isso, suspenso.
 * `manuallySuspended` tem precedência.
 */
export function accessState(
    dueDate: Date,
    now: Date = new Date(),
    manuallySuspended = false,
    /** Without a contract in force (pending or ended) nobody gets in, whatever the payments. */
    contract: 'pending' | 'active' | 'ended' = 'active'
): AccessState {
    if (manuallySuspended || contract !== 'active') return AccessState.Suspended;
    const overdueMs = now.getTime() - dueDate.getTime();
    if (overdueMs <= 0) return AccessState.Active;
    return overdueMs <= GRACE_DAYS * DAY_MS ? AccessState.Grace : AccessState.Suspended;
}

export type RestaurantStatus = 'pending' | 'active' | 'grace' | 'suspended' | 'ended';

export const RESTAURANT_STATUS_LABEL: Record<RestaurantStatus, string> = {
    pending: 'Pendente',
    active: 'Ativo',
    grace: 'Em tolerância',
    suspended: 'Suspenso',
    ended: 'Contrato encerrado'
};

/**
 * One status per restaurant, each in exactly one bucket: the contract comes first
 * (no contract yet, or it ended), then payments and the manual suspension.
 */
export function restaurantStatus(
    input: {
        contract: 'pending' | 'active' | 'ended';
        dueDate: Date;
        suspended: boolean;
    },
    now: Date = new Date()
): RestaurantStatus {
    if (input.contract !== 'active') return input.contract;
    return accessState(input.dueDate, now, input.suspended);
}
