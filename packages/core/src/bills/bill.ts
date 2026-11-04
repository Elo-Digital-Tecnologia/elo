import { splitEqually } from '../money/cents.js';

export interface BillLine {
    name: string;
    unitCents: number;
    quantity: number;
}

/** Manual bill adjustment (waiter or cashier): positive adds, negative gives a discount. */
export interface BillAdjustment {
    label: string;
    cents: number;
}

export interface Bill {
    subtotalCents: number;
    serviceFeeCents: number;
    adjustmentsCents: number;
    totalCents: number;
}

/**
 * `serviceFeeBps`: fee in basis points (1000 = 10%), calculated on the items subtotal.
 * `waiveFee`: fee removed (by the guest or the waiter).
 * Adjustments come after the fee; the total is never negative.
 */
export function calculateBill(
    lines: BillLine[],
    serviceFeeBps: number,
    waiveFee = false,
    adjustments: BillAdjustment[] = []
): Bill {
    const subtotalCents = lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);
    const serviceFeeCents = waiveFee
        ? 0
        : Math.round((subtotalCents * serviceFeeBps) / 10_000);
    const adjustmentsCents = adjustments.reduce((sum, a) => sum + a.cents, 0);
    const totalCents = Math.max(0, subtotalCents + serviceFeeCents + adjustmentsCents);
    return { subtotalCents, serviceFeeCents, adjustmentsCents, totalCents };
}

/** Split per person: equally among N. */
export function splitBillEqually(bill: Bill, people: number): number[] {
    return splitEqually(bill.totalCents, people);
}

/**
 * Split per item: `consumedCents[i]` is the items subtotal of person i. The fee and
 * adjustments are shared in proportion to consumption; the largest remainder settles
 * the cents, so the parts always add up to the total.
 */
export function splitBillByItems(bill: Bill, consumedCents: number[]): number[] {
    if (consumedCents.length === 0) throw new RangeError('at least one person');
    if (consumedCents.some((c) => !Number.isInteger(c) || c < 0))
        throw new RangeError('invalid consumption');
    const consumed = consumedCents.reduce((a, b) => a + b, 0);
    if (consumed !== bill.subtotalCents)
        throw new RangeError('consumption must add up to the subtotal');
    if (consumed === 0) return splitEqually(bill.totalCents, consumedCents.length);

    const exact = consumedCents.map((c) => (bill.totalCents * c) / consumed);
    const parts = exact.map(Math.floor);
    let rest = bill.totalCents - parts.reduce((a, b) => a + b, 0);
    const order = exact
        .map((v, i) => ({ i, frac: v - Math.floor(v) }))
        .sort((a, b) => b.frac - a.frac || a.i - b.i);
    for (const { i } of order) {
        if (rest <= 0) break;
        parts[i] = (parts[i] ?? 0) + 1;
        rest -= 1;
    }
    return parts;
}
