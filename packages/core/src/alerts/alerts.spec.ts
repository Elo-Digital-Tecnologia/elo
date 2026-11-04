import { describe, expect, it } from 'vitest';
import { guestAlertOf } from './alerts.js';

describe('guestAlertOf', () => {
    it('tells the guest when the table opens and closes, not when a waiter takes it over', () => {
        expect(
            guestAlertOf('table.updated', {
                id: 't1',
                change: 'opened',
                handledBy: { name: 'Ana' }
            })
        ).toMatchObject({
            kind: 'table_opened',
            who: 'Ana'
        });
        expect(
            guestAlertOf('table.updated', { id: 't1', change: 'closed' })
        ).toMatchObject({ kind: 'table_closed' });
        expect(
            guestAlertOf('table.updated', { id: 't1', change: 'taken', state: 'open' })
        ).toBeNull();
    });

    it('follows the order through the kitchen', () => {
        const order = { id: 'o1', items: [{ quantity: 2, name: 'Pastel' }] };
        expect(
            guestAlertOf('order.updated', { ...order, status: 'received' })
        ).toBeNull();
        expect(
            guestAlertOf('order.updated', { ...order, status: 'preparing' })
        ).toMatchObject({
            kind: 'order_preparing',
            items: [{ quantity: 2, name: 'Pastel' }]
        });
        expect(
            guestAlertOf('order.updated', { ...order, status: 'ready' })
        ).toMatchObject({ kind: 'order_ready', tag: 'order:o1' });
    });

    it('names who answered the call', () => {
        expect(
            guestAlertOf('call.resolved', { id: 'c1', handledBy: { name: 'Bruno' } })?.who
        ).toBe('Bruno');
        expect(
            guestAlertOf('call.resolved', { id: 'c1', handledBy: null })?.who
        ).toBeNull();
    });
});
