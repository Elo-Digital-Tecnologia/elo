import { guestAlertOf } from './alerts';

describe('guestAlertOf', () => {
  it('tells the guest when the table opens and closes, not when a waiter takes it over', () => {
    expect(guestAlertOf('table.updated', { id: 't1', change: 'opened', handledBy: { name: 'Ana' } })).toMatchObject({ kind: 'table_opened', body: 'Ana liberou os pedidos. Bom apetite!' });
    expect(guestAlertOf('table.updated', { id: 't1', change: 'closed' })).toMatchObject({ kind: 'table_closed' });
    expect(guestAlertOf('table.updated', { id: 't1', change: 'taken', state: 'open' })).toBeNull();
  });

  it('follows the order through the kitchen', () => {
    const order = { id: 'o1', items: [{ quantity: 2, name: 'Pastel' }] };
    expect(guestAlertOf('order.updated', { ...order, status: 'received' })).toBeNull();
    expect(guestAlertOf('order.updated', { ...order, status: 'preparing' })).toMatchObject({ kind: 'order_preparing', body: '2x Pastel' });
    expect(guestAlertOf('order.updated', { ...order, status: 'ready' })).toMatchObject({ kind: 'order_ready', tag: 'order:o1' });
  });

  it('names who answered the call', () => {
    expect(guestAlertOf('call.resolved', { id: 'c1', handledBy: { name: 'Bruno' } })?.title).toBe('Bruno está indo até você');
    expect(guestAlertOf('call.resolved', { id: 'c1', handledBy: null })?.title).toBe('O garçom está indo até você');
  });
});
