import { Role } from '../roles/roles.js';

/** Events that call for someone's attention, whatever screen they are on. */
export type AlertKind =
    | 'open_request'
    | 'call'
    | 'bill_request'
    | 'order_ready'
    | 'new_order'
    | 'order_cancelled';

interface AlertSpec {
    roles: Role[];
    /** Panel page that handles it, relative to /r/<slug>. */
    path: string;
}

export const ALERTS: Record<AlertKind, AlertSpec> = {
    open_request: {
        roles: [Role.WAITER],
        path: '/waiter'
    },
    call: {
        roles: [Role.WAITER],
        path: '/waiter'
    },
    bill_request: {
        roles: [Role.WAITER, Role.CASHIER],
        path: '/waiter'
    },
    order_ready: {
        roles: [Role.WAITER],
        path: '/waiter'
    },
    new_order: {
        roles: [Role.KITCHEN],
        path: '/kitchen'
    },
    order_cancelled: {
        roles: [Role.KITCHEN],
        path: '/kitchen'
    }
};

export interface Alert {
    kind: AlertKind;
    /** Name of the table, when the event carries it. */
    table: string | null;
    /** Collapses repeated alerts about the same thing into one notification. */
    tag: string;
}

/**
 * Reads a realtime event and says whether it is an alert. Shared by the
 * panel (sound and banner) and the API (push), so both alert on the same
 * things.
 */
export function alertOf(event: string, payload: unknown): Alert | null {
    const p = (payload ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    if (event === 'table.updated') {
        const table = str(p['name']) || null;
        if (p['state'] === 'pending_open')
            return { kind: 'open_request', table, tag: `open:${str(p['id'])}` };
        if (p['state'] === 'pending_close')
            return { kind: 'bill_request', table, tag: `bill:${str(p['id'])}` };
        return null;
    }
    const table = str(p['tableName']) || null;
    if (event === 'call.created')
        return { kind: 'call', table, tag: `call:${str(p['id'])}` };
    if (event === 'order.created')
        return { kind: 'new_order', table, tag: `order:${str(p['id'])}` };
    if (event === 'order.updated' && p['status'] === 'ready')
        return { kind: 'order_ready', table, tag: `ready:${str(p['id'])}` };
    if (event === 'order.cancelled' && p['alertKitchen'] === true)
        return { kind: 'order_cancelled', table, tag: `cancel:${str(p['id'])}` };
    return null;
}

/** Whether a member with these roles should hear about it. */
export const alertsRole = (kind: AlertKind, roles: readonly string[]) =>
    ALERTS[kind].roles.some((r) => roles.includes(r));

/** What the guest at the table hears about. */
export type GuestAlertKind =
    'table_opened' | 'order_preparing' | 'order_ready' | 'call_answered' | 'table_closed';

export interface GuestAlert {
    kind: GuestAlertKind;
    /** Who handled it (the waiter who opened the table or answered the call), when known. */
    who: string | null;
    /** The order's items, for order alerts. */
    items: { quantity: number; name: string }[];
    tag: string;
}

/**
 * Reads a realtime event sent to a table and says whether the guest should be
 * told. Shared by the guest page (sound and banner) and the API (push).
 * Table events carry `change`, so a waiter taking over the table is not
 * mistaken for the table being opened.
 */
export function guestAlertOf(event: string, payload: unknown): GuestAlert | null {
    const p = (payload ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const who =
        str((p['handledBy'] as { name?: unknown } | null | undefined)?.name) || null;
    const id = str(p['id']);
    const alert = (
        kind: GuestAlertKind,
        tag: string,
        items: GuestAlert['items'] = []
    ) => ({
        kind,
        who,
        items,
        tag
    });
    if (event === 'table.updated') {
        if (p['change'] === 'opened') return alert('table_opened', `opened:${id}`);
        if (p['change'] === 'closed') return alert('table_closed', `closed:${id}`);
        return null;
    }
    const items = Array.isArray(p['items'])
        ? (p['items'] as { quantity?: unknown; name?: unknown }[]).map((i) => ({
              quantity: Number(i.quantity) || 0,
              name: str(i.name)
          }))
        : [];
    if (event === 'order.updated' && p['status'] === 'preparing')
        return alert('order_preparing', `order:${id}`, items);
    if (event === 'order.updated' && p['status'] === 'ready')
        return alert('order_ready', `order:${id}`, items);
    if (event === 'call.resolved') return alert('call_answered', `call:${id}`);
    return null;
}
