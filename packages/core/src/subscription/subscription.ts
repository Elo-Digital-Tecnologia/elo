import { MS_PER_DAY } from '../time/time-units.js';

export const GRACE_DAYS = 7;

export const AccessState = {
    ACTIVE: 'active',
    GRACE: 'grace',
    SUSPENDED: 'suspended'
} as const;
export type AccessState = (typeof AccessState)[keyof typeof AccessState];

/**
 * Restaurant access state. `dueDate` is the due date; up to `GRACE_DAYS` days after it
 * the system works with a warning; after that, it is suspended.
 * `manuallySuspended` takes precedence.
 */
export function accessState(
    dueDate: Date,
    now: Date = new Date(),
    manuallySuspended = false,
    /** Without a contract in force (pending or ended) nobody gets in, whatever the payments. */
    contract: 'pending' | 'active' | 'ended' = 'active'
): AccessState {
    if (manuallySuspended || contract !== 'active') return AccessState.SUSPENDED;
    const overdueMs = now.getTime() - dueDate.getTime();
    if (overdueMs <= 0) return AccessState.ACTIVE;
    return overdueMs <= GRACE_DAYS * MS_PER_DAY
        ? AccessState.GRACE
        : AccessState.SUSPENDED;
}

export type RestaurantStatus = 'pending' | 'active' | 'grace' | 'suspended' | 'ended';
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
