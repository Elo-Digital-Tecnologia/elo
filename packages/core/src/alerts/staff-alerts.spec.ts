import { describe, expect, it } from 'vitest';
import { alertOf, alertsRole } from './alerts.js';

describe('alerts', () => {
    it('turns realtime events into alerts for the right roles', () => {
        expect(
            alertOf('table.updated', { id: 't', name: 'Mesa 7', state: 'pending_open' })
        ).toEqual({ kind: 'open_request', table: 'Mesa 7', tag: 'open:t' });
        expect(
            alertOf('table.updated', { id: 't', name: 'Mesa 7', state: 'open' })
        ).toBeNull();
        expect(
            alertOf('order.updated', {
                id: 'o',
                tableName: 'Mesa 2',
                status: 'preparing'
            })
        ).toBeNull();
        expect(
            alertOf('order.cancelled', {
                id: 'o',
                tableName: 'Mesa 2',
                alertKitchen: false
            })
        ).toBeNull();
        expect(alertsRole('new_order', ['kitchen', 'cashier'])).toBe(true);
        expect(alertsRole('call', ['kitchen'])).toBe(false);
        expect(alertsRole('bill_request', ['cashier'])).toBe(true);
    });
});
