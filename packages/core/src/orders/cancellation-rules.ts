import type { OrderStatus } from './order-status.js';
import { Role } from '../roles/roles.js';

export type CancelActor =
    | { kind: 'customer' }
    | { kind: 'staff'; roles: readonly Role[]; managesTable?: boolean };

const MANAGERS: Role[] = [Role.RESTAURANT_ADMIN, Role.ELO_ADMIN, Role.SUPERADMIN];

/** Why an order cannot be cancelled or returned. */
export type OrderRuleRefusal =
    | 'already_closed'
    | 'use_return'
    | 'preparation_started'
    | 'not_your_table'
    | 'role_not_allowed'
    | 'not_ready';

export type CancelDecision =
    | { allowed: true; reasonRequired: boolean; notifyKitchen: boolean }
    | { allowed: false; why: OrderRuleRefusal };

/**
 * Cancellation rules (REFERENCE). Guest: before preparation. Waiter: up to
 * "preparing", only tables they serve, with a reason. Admin: up to "preparing", with a
 * reason. After "ready" nobody cancels; the order goes to the separate "returned"
 * status instead (`returnRule`).
 */
export function cancellationRule(
    actor: CancelActor,
    status: OrderStatus
): CancelDecision {
    if (status === 'cancelled' || status === 'returned')
        return { allowed: false, why: 'already_closed' };
    if (status === 'ready') return { allowed: false, why: 'use_return' };
    const notifyKitchen = status === 'preparing';

    if (actor.kind === 'customer') {
        return status === 'sent' || status === 'received'
            ? { allowed: true, reasonRequired: false, notifyKitchen }
            : { allowed: false, why: 'preparation_started' };
    }
    if (actor.roles.some((r) => MANAGERS.includes(r))) {
        return { allowed: true, reasonRequired: true, notifyKitchen };
    }
    if (actor.roles.includes(Role.WAITER)) {
        if (!actor.managesTable) return { allowed: false, why: 'not_your_table' };
        return { allowed: true, reasonRequired: true, notifyKitchen };
    }
    return { allowed: false, why: 'role_not_allowed' };
}

export type ReturnDecision =
    { allowed: true; reasonRequired: true } | { allowed: false; why: OrderRuleRefusal };

/**
 * Return or refusal of an order already "ready". The waiter (of a table they serve) or
 * the restaurant admin, always with a reason. Recorded as a pending decision: the
 * REFERENCE does not say who carries it out.
 */
export function returnRule(actor: CancelActor, status: OrderStatus): ReturnDecision {
    if (status !== 'ready') return { allowed: false, why: 'not_ready' };
    if (actor.kind === 'customer') return { allowed: false, why: 'role_not_allowed' };
    if (actor.roles.includes(Role.RESTAURANT_ADMIN))
        return { allowed: true, reasonRequired: true };
    if (actor.roles.includes(Role.WAITER)) {
        return actor.managesTable
            ? { allowed: true, reasonRequired: true }
            : { allowed: false, why: 'not_your_table' };
    }
    return { allowed: false, why: 'role_not_allowed' };
}
