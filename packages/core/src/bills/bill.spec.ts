import { describe, expect, it } from 'vitest';
import { calculateBill, splitBillByItems, splitBillEqually } from './bill.js';

describe('calculateBill', () => {
    const lines = [
        { name: 'a', unitCents: 2500, quantity: 2 },
        { name: 'b', unitCents: 1000, quantity: 1 }
    ];
    it('adds service fee', () => {
        expect(calculateBill(lines, 1000)).toEqual({
            subtotalCents: 6000,
            serviceFeeCents: 600,
            adjustmentsCents: 0,
            totalCents: 6600
        });
    });
    it('applies adjustments after the fee and never goes negative', () => {
        expect(
            calculateBill(lines, 1000, false, [{ label: 'cortesia', cents: -500 }])
                .totalCents
        ).toBe(6100);
        expect(
            calculateBill(lines, 1000, false, [{ label: 'x', cents: -99_999 }]).totalCents
        ).toBe(0);
    });
    it('splits by items, prorating fee, always adding up to the total', () => {
        const bill = calculateBill(lines, 1000, false, [
            { label: 'desconto', cents: -1 }
        ]);
        for (const consumed of [
            [6000],
            [3000, 3000],
            [1000, 2000, 3000],
            [1, 1999, 4000],
            [2500, 2500, 1000]
        ]) {
            const parts = splitBillByItems(bill, consumed);
            expect(parts.reduce((a, b) => a + b, 0)).toBe(bill.totalCents);
            expect(parts.every((p) => p >= 0)).toBe(true);
        }
        expect(() => splitBillByItems(bill, [100, 100])).toThrow();
    });
    it('waived fee', () => {
        expect(calculateBill(lines, 1000, true).totalCents).toBe(6000);
    });
    it('splits without losing cents', () => {
        const parts = splitBillEqually(calculateBill(lines, 1000), 4);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(6600);
    });
});
