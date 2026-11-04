import { MS_PER_DAY } from '../time/time-units.js';

export const OrderStatus = {
    SENT: 'sent',
    RECEIVED: 'received',
    PREPARING: 'preparing',
    READY: 'ready',
    CANCELLED: 'cancelled',
    /** Refused or returned after "ready" (cancelling is not allowed at that point). */
    RETURNED: 'returned'
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** Steps the kitchen moves an order through. */
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
    sent: 'received',
    received: 'preparing',
    preparing: 'ready'
};

export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
    return NEXT[status] ?? null;
}

const PREVIOUS: Partial<Record<OrderStatus, OrderStatus>> = {
    received: 'sent',
    preparing: 'received',
    ready: 'preparing'
};

/** One step back, for a status advanced by mistake. */
export function previousOrderStatus(status: OrderStatus): OrderStatus | null {
    return PREVIOUS[status] ?? null;
}

/** Sent to the kitchen and not ready yet. */
export const ORDER_IN_PROGRESS: OrderStatus[] = [
    OrderStatus.SENT,
    OrderStatus.RECEIVED,
    OrderStatus.PREPARING
];

/**
 * The guest asks for the bill only once the kitchen is done with every order:
 * the bill must not close over food still being made. The waiter still
 * confirms by closing the table.
 */
export const canRequestBill = (statuses: readonly string[]) =>
    !statuses.some((s) => (ORDER_IN_PROGRESS as string[]).includes(s));

/** Floor roles (waiter, cashier, kitchen) look back this many days in the order history: enough for the shift and a guest's question. */
export const ORDER_HISTORY_FLOOR_DAYS = 2;

/** Earliest moment a member may see in the order history; null means no limit (owner and managers). */
export function orderHistoryStart(roles: readonly string[], now: Date): Date | null {
    if (roles.includes('restaurant_admin') || roles.includes('manager')) return null;
    return new Date(now.getTime() - ORDER_HISTORY_FLOOR_DAYS * MS_PER_DAY);
}

/** What an order costs: unit price (options included) times quantity, summed. */
export const orderTotalCents = (
    items: readonly { unitCents: number; quantity: number }[]
) => items.reduce((sum, i) => sum + i.unitCents * i.quantity, 0);
