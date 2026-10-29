import { openStatus } from './open-status';
import { cancellationRule, returnRule } from './cancellation';
import { calculateBill, splitBillByItems, splitBillEqually } from './bill';
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
  it('admin cancels up to preparing; after ready only a return is possible', () => {
    const a = { kind: 'staff', role: Role.RestaurantAdmin } as const;
    expect(cancellationRule(a, 'preparing')).toMatchObject({ allowed: true, reasonRequired: true });
    expect(cancellationRule(a, 'ready')).toEqual({ allowed: false, why: 'use_return' });
    expect(cancellationRule(a, 'cancelled')).toMatchObject({ allowed: false });
    expect(cancellationRule(a, 'returned')).toMatchObject({ allowed: false });
  });
  it('kitchen/cashier cannot cancel', () => {
    expect(cancellationRule({ kind: 'staff', role: Role.Kitchen }, 'sent')).toMatchObject({
      allowed: false,
    });
  });
});

describe('returnRule', () => {
  it('only from ready, with reason, waiter on own table or admin', () => {
    const w = { kind: 'staff', role: Role.Waiter, managesTable: true } as const;
    expect(returnRule(w, 'ready')).toEqual({ allowed: true, reasonRequired: true });
    expect(returnRule(w, 'preparing')).toMatchObject({ allowed: false });
    expect(returnRule({ ...w, managesTable: false }, 'ready')).toMatchObject({ allowed: false });
    expect(returnRule({ kind: 'staff', role: Role.RestaurantAdmin }, 'ready')).toMatchObject({ allowed: true });
    expect(returnRule({ kind: 'staff', role: Role.Kitchen }, 'ready')).toMatchObject({ allowed: false });
    expect(returnRule({ kind: 'customer' }, 'ready')).toMatchObject({ allowed: false });
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
      adjustmentsCents: 0,
      totalCents: 6600,
    });
  });
  it('applies adjustments after the fee and never goes negative', () => {
    expect(calculateBill(lines, 1000, false, [{ label: 'cortesia', cents: -500 }]).totalCents).toBe(6100);
    expect(calculateBill(lines, 1000, false, [{ label: 'x', cents: -99_999 }]).totalCents).toBe(0);
  });
  it('splits by items, prorating fee, always adding up to the total', () => {
    const bill = calculateBill(lines, 1000, false, [{ label: 'desconto', cents: -1 }]);
    for (const consumed of [[6000], [3000, 3000], [1000, 2000, 3000], [1, 1999, 4000], [2500, 2500, 1000]]) {
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

describe('openStatus', () => {
  const TZ = 'America/Sao_Paulo'; // UTC-3, sem horário de verão
  const day = { open: '11:00', close: '23:00' };
  const week = [null, day, day, day, day, day, { open: '11:00', close: '02:00' }]; // dom fechado; sáb vai até 02:00
  const at = (isoUtc: string) => openStatus(week, new Date(isoUtc), TZ);

  it('sem horário cadastrado não mostra nada', () => {
    expect(openStatus(null, new Date(), TZ)).toBeNull();
    expect(openStatus([], new Date(), TZ)).toBeNull();
  });
  it('aberto dentro do horário, no fuso do restaurante', () => {
    // segunda 14:00 em Brasília = 17:00 UTC
    expect(at('2026-11-02T17:00:00Z')).toEqual({ open: true, label: 'Aberto · fecha às 23:00' });
  });
  it('antes de abrir diz que abre hoje', () => {
    expect(at('2026-11-02T12:00:00Z')).toEqual({ open: false, label: 'Fechado · abre hoje às 11:00' }); // 09:00 em Brasília
  });
  it('depois de fechar aponta o próximo dia', () => {
    expect(at('2026-11-03T02:30:00Z')).toEqual({ open: false, label: 'Fechado · abre amanhã às 11:00' }); // seg 23:30 em Brasília
  });
  it('domingo fechado leva para segunda', () => {
    expect(at('2026-11-01T15:00:00Z')).toEqual({ open: false, label: 'Fechado · abre amanhã às 11:00' });
  });
  it('turno que passa da meia-noite continua aberto no dia seguinte', () => {
    // sábado 23:30 aberto; domingo 01:00 ainda vale o turno de sábado; domingo 03:00 já fechou
    expect(at('2026-11-08T02:30:00Z')).toEqual({ open: true, label: 'Aberto · fecha às 02:00' }); // sáb 23:30
    expect(at('2026-11-08T04:00:00Z')).toEqual({ open: true, label: 'Aberto · fecha às 02:00' }); // dom 01:00
    expect(at('2026-11-08T06:00:00Z')).toMatchObject({ open: false }); // dom 03:00
  });
  it('semana toda fechada', () => {
    expect(openStatus([null, null, null, null, null, null, null], new Date(), TZ)).toEqual({ open: false, label: 'Fechado' });
  });
});
