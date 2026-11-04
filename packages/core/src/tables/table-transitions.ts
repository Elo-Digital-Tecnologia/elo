import type { TableState } from './table-state.js';

/** Valid table state transitions. Single source; whoever changes the state checks here. */
const TRANSITIONS: Record<TableState, TableState[]> = {
    closed: ['pending_open'],
    pending_open: ['open', 'closed'],
    open: ['pending_close'],
    pending_close: ['closed', 'open']
};

export function canTransitionTable(from: TableState, to: TableState): boolean {
    return TRANSITIONS[from].includes(to);
}

/** The waiter may also close straight from `open` (the guest does not need to ask). */
export function canWaiterClose(from: TableState): boolean {
    return from === 'open' || from === 'pending_close';
}
