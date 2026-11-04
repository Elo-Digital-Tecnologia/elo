export const TableState = {
    CLOSED: 'closed',
    PENDING_OPEN: 'pending_open',
    OPEN: 'open',
    PENDING_CLOSE: 'pending_close'
} as const;
export type TableState = (typeof TableState)[keyof typeof TableState];
