import type { Role } from '../../roles/roles.js';

export interface ReportView {
    from: string;
    to: string;
    totals: {
        /** Sum of the items of valid orders (no service fee). */
        revenueCents: number;
        orders: number;
        items: number;
        averageTicketCents: number;
        cancelled: number;
        returned: number;
    };
    byDay: { date: string; revenueCents: number; orders: number }[];
    byHour: { hour: number; orders: number }[];
    topProducts: { name: string; quantity: number; revenueCents: number }[];
}

export interface StaffPerformanceRow {
    id: string;
    name: string;
    roles: Role[];
    archived: boolean;
    callsAnswered: number;
    /** Average seconds from the guest's call to a waiter taking it; null without calls. */
    avgCallSeconds: number | null;
    tablesOpened: number;
    /** Average seconds from the opening request to the waiter's validation. */
    avgOpenSeconds: number | null;
    tablesClosed: number;
}

export interface StaffReportView {
    from: string;
    to: string;
    rows: StaffPerformanceRow[];
}
