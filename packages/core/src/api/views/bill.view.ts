import type { TableState } from '../../tables/table-state.js';

export type FeeWaivedBy = 'customer' | 'staff';

export interface BillAdjustmentView {
    label: string;
    cents: number;
    reason: string | null;
    createdAt: string;
}

export interface BillLineView {
    name: string;
    unitCents: number;
    quantity: number;
    /** Chosen options, already as text ("Size: Large"). */
    details: string[];
}

/** Table bill: valid orders of the active session (no cancelled or returned ones). */
export interface BillView {
    tableId: string;
    tableName: string;
    state: TableState;
    serviceFeeBps: number;
    feeWaivedBy: FeeWaivedBy | null;
    /** The restaurant lets guests refuse the service fee themselves. */
    guestCanRefuseFee: boolean;
    lines: BillLineView[];
    adjustments: BillAdjustmentView[];
    subtotalCents: number;
    serviceFeeCents: number;
    adjustmentsCents: number;
    totalCents: number;
}
