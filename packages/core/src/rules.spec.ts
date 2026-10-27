import { cancellationRule } from './cancellation';
import { calculateBill, splitBillEqually } from './bill';
import { canTransitionTable, canWaiterClose } from './table-state';
import { Role } from './roles';

describe('cancellationRule', () => {
  it('customer only before preparing', () => {
    expect(cancellationRule({ kind: 'customer' }, 'received')).toMatchObject({ allowed: true });
    expect(cancellationRule({ kind: 'customer' }, 'preparing')).toMatchObject({ allowed: false });
  });
  it('waiter: own table, reason required, notifies kitchen when preparing', () => {
    const w = { kind: 'staff', role: Role.Waiter, managesTable: true } as const;
    expect(cancellationRule(w, 'preparing')).toEqual({
      allowed: true,
      reasonRequired: true,
      notifyKitchen: true,
    });
    expect(cancellationRule(w, 'ready')).toMatchObject({ allowed: false });
    expect(cancellationRule({ ...w, managesTable: false }, 'sent')).toMatchObject({
      allowed: false,
    });
  });
  it('admin any non-cancelled status', () => {
    const a = { kind: 'staff', role: Role.RestaurantAdmin } as const;
    expect(cancellationRule(a, 'ready')).toMatchObject({ allowed: true, reasonRequired: true });
    expect(cancellationRule(a, 'cancelled')).toMatchObject({ allowed: false });
  });
  it('kitchen/cashier cannot cancel', () => {
    expect(cancellationRule({ kind: 'staff', role: Role.Kitchen }, 'sent')).toMatchObject({
      allowed: false,
    });
  });
});

describe('table state', () => {
  it('requires validation before open', () => {
    expect(canTransitionTable('closed', 'open')).toBe(false);
    expect(canTransitionTable('pending_open', 'open')).toBe(true);
  });
  it('waiter closes from open or pending_close only', () => {
    expect(canWaiterClose('open')).toBe(true);
    expect(canWaiterClose('pending_open')).toBe(false);
  });
});

describe('calculateBill', () => {
  const lines = [
    { name: 'a', unitCents: 2500, quantity: 2 },
    { name: 'b', unitCents: 1000, quantity: 1 },
  ];
  it('adds service fee', () => {
    expect(calculateBill(lines, 1000)).toEqual({
      subtotalCents: 6000,
      serviceFeeCents: 600,
      totalCents: 6600,
    });
  });
  it('waived fee', () => {
    expect(calculateBill(lines, 1000, true).totalCents).toBe(6000);
  });
  it('splits without losing cents', () => {
    const parts = splitBillEqually(calculateBill(lines, 1000), 4);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(6600);
  });
});

import { parseCents } from './money';

describe('parseCents', () => {
  it('parses comma and dot', () => {
    expect(parseCents('12,50')).toBe(1250);
    expect(parseCents('12.5')).toBe(1250);
    expect(parseCents('7')).toBe(700);
  });
  it('rejects garbage', () => {
    expect(parseCents('abc')).toBeNull();
    expect(parseCents('-1')).toBeNull();
  });
});
