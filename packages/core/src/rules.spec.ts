import { availability, openStatus, pauseProblems } from './open-status';
import { cancellationRule, returnRule } from './cancellation';
import { calculateBill, splitBillByItems, splitBillEqually } from './bill';
import { canTransitionTable, canWaiterClose } from './table-state';
import { Role, rolesOf } from './roles';
import { canTransferOwnership, ownershipRoles, staffRule } from './staff-rules';
import { previousOrderStatus } from './orders';
import { formatDuration } from './duration';
import { canGrant, upgradePermissions, withRequired } from './permissions';
import { alertOf, alertsRole } from './alerts';
import { brazilPhone, contact, instagramHandle, maskPhone, personName } from './validation';

describe('cancellationRule', () => {
  it('customer only before preparing', () => {
    expect(cancellationRule({ kind: 'customer' }, 'received')).toMatchObject({ allowed: true });
    expect(cancellationRule({ kind: 'customer' }, 'preparing')).toMatchObject({ allowed: false });
  });
  it('waiter: own table, reason required, notifies kitchen when preparing', () => {
    const w = { kind: 'staff', roles: [Role.Waiter], managesTable: true } as const;
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
    const a = { kind: 'staff', roles: [Role.RestaurantAdmin] } as const;
    expect(cancellationRule(a, 'preparing')).toMatchObject({ allowed: true, reasonRequired: true });
    expect(cancellationRule(a, 'ready')).toEqual({ allowed: false, why: 'use_return' });
    expect(cancellationRule(a, 'cancelled')).toMatchObject({ allowed: false });
    expect(cancellationRule(a, 'returned')).toMatchObject({ allowed: false });
  });
  it('kitchen/cashier cannot cancel', () => {
    expect(cancellationRule({ kind: 'staff', roles: [Role.Kitchen] }, 'sent')).toMatchObject({
      allowed: false,
    });
  });
});

describe('returnRule', () => {
  it('only from ready, with reason, waiter on own table or admin', () => {
    const w = { kind: 'staff', roles: [Role.Waiter], managesTable: true } as const;
    expect(returnRule(w, 'ready')).toEqual({ allowed: true, reasonRequired: true });
    expect(returnRule(w, 'preparing')).toMatchObject({ allowed: false });
    expect(returnRule({ ...w, managesTable: false }, 'ready')).toMatchObject({ allowed: false });
    expect(returnRule({ kind: 'staff', roles: [Role.RestaurantAdmin] }, 'ready')).toMatchObject({ allowed: true });
    expect(returnRule({ kind: 'staff', roles: [Role.Kitchen] }, 'ready')).toMatchObject({ allowed: false });
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

describe('availability', () => {
  const TZ = 'America/Sao_Paulo';
  const week = [null, ...Array(6).fill({ open: '18:00', close: '23:00' })];
  const now = new Date('2026-11-10T22:30:00Z'); // terça 19:30 local
  it('is always open without hours or closures', () => {
    expect(availability({ hours: null, pauses: [], now, timeZone: TZ })).toEqual({ open: true, reason: null, label: null, pauseReason: null, changesAt: null });
  });
  it('follows the hours and says when they change', () => {
    expect(availability({ hours: week, pauses: [], now, timeZone: TZ })).toMatchObject({ open: true, reason: null, changesAt: '2026-11-11T02:00:00.000Z' });
    const later = availability({ hours: week, pauses: [], now: new Date('2026-11-11T03:00:00Z'), timeZone: TZ });
    expect(later).toMatchObject({ open: false, reason: 'hours', label: 'Fechado · abre hoje às 18:00', changesAt: '2026-11-11T21:00:00.000Z' });
  });
  it('a closure wins over the hours and ends early when someone reopens', () => {
    const pause = { startsAt: '2026-11-10T21:00:00Z', endsAt: '2026-11-12T21:00:00Z', reason: ' Reforma ' };
    expect(availability({ hours: week, pauses: [pause], now, timeZone: TZ })).toEqual({
      open: false,
      reason: 'pause',
      label: 'Fechado temporariamente · volta em 12/11 às 18:00',
      pauseReason: 'Reforma',
      changesAt: '2026-11-12T21:00:00.000Z',
    });
    expect(availability({ hours: null, pauses: [{ ...pause, endsAt: null }], now, timeZone: TZ })).toMatchObject({ label: 'Fechado temporariamente', changesAt: null });
    expect(availability({ hours: null, pauses: [{ ...pause, endedAt: '2026-11-10T22:00:00Z' }], now, timeZone: TZ }).open).toBe(true);
    expect(availability({ hours: null, pauses: [{ ...pause, endsAt: '2026-11-11T01:00:00Z' }], now, timeZone: TZ }).label).toBe('Fechado temporariamente · volta hoje às 22:00');
  });
  it('a scheduled closure is the next change', () => {
    const pause = { startsAt: '2026-11-10T23:00:00Z', endsAt: null };
    expect(availability({ hours: null, pauses: [pause], now, timeZone: TZ })).toMatchObject({ open: true, changesAt: '2026-11-10T23:00:00.000Z' });
  });
  it('checks a new closure', () => {
    const at = (iso: string) => new Date(iso);
    expect(pauseProblems({ startsAt: now, endsAt: at('2026-11-10T22:00:00Z') }, [], now)).toEqual(['ends_before_start']);
    expect(pauseProblems({ startsAt: at('2026-11-09T22:00:00Z'), endsAt: null }, [], now)).toEqual(['starts_in_past']);
    expect(pauseProblems({ startsAt: at('2028-01-01T00:00:00Z'), endsAt: null }, [], now)).toEqual(['too_far_ahead']);
    const other = { startsAt: '2026-11-11T00:00:00Z', endsAt: '2026-11-11T05:00:00Z' };
    expect(pauseProblems({ startsAt: now, endsAt: at('2026-11-11T01:00:00Z') }, [other], now)).toEqual(['overlaps']);
    expect(pauseProblems({ startsAt: now, endsAt: at('2026-11-10T23:00:00Z') }, [other], now)).toEqual([]);
    expect(pauseProblems({ startsAt: now, endsAt: null }, [{ ...other, endedAt: '2026-11-10T22:00:00Z' }], now)).toEqual([]);
  });
});

describe('staffRule', () => {
  const owner = { sub: 'a', roles: [Role.RestaurantAdmin] };
  const ownerRow = { id: 'a', roles: [Role.RestaurantAdmin, Role.Cashier] };
  const waiter = { id: 'w', roles: [Role.Waiter] };
  const manager = { sub: 'm', roles: [Role.Manager] };
  const support = { sub: 'elo:x', roles: [Role.RestaurantAdmin], impersonatedBy: 'x' };
  it('nobody archives, deactivates or changes the roles of their own account', () => {
    const me = { id: 'a', roles: owner.roles };
    expect(staffRule(owner, me, 'edit')).toEqual({ allowed: true });
    for (const a of ['archive', 'set_active', 'change_roles', 'reset_password'] as const) {
      expect(staffRule(owner, me, a)).toEqual({ allowed: false, why: 'self' });
    }
  });
  it('the owner manages managers; a manager only manages the floor and kitchen team', () => {
    const otherManager = { id: 'm2', roles: [Role.Manager] };
    expect(staffRule(owner, otherManager, 'reset_password')).toEqual({ allowed: true });
    expect(staffRule(owner, waiter, 'change_roles', { nextRoles: [Role.Manager] })).toEqual({ allowed: true });
    expect(staffRule(manager, waiter, 'reset_password')).toEqual({ allowed: true });
    expect(staffRule(manager, waiter, 'change_roles', { nextRoles: [Role.Waiter, Role.Cashier] })).toEqual({ allowed: true });
    expect(staffRule(manager, waiter, 'change_roles', { nextRoles: [Role.Manager] })).toEqual({ allowed: false, why: 'not_above' });
    expect(staffRule(manager, otherManager, 'archive')).toEqual({ allowed: false, why: 'not_above' });
    expect(staffRule(manager, ownerRow, 'edit')).toEqual({ allowed: false, why: 'not_above' });
    expect(staffRule(manager, { id: 'm', roles: [Role.Manager] }, 'edit')).toEqual({ allowed: true });
  });
  it('the owner role only moves through a transfer, even for support', () => {
    expect(staffRule(owner, waiter, 'change_roles', { nextRoles: [Role.RestaurantAdmin] })).toEqual({ allowed: false, why: 'owner' });
    expect(staffRule(support, ownerRow, 'change_roles', { nextRoles: [Role.Waiter] })).toEqual({ allowed: false, why: 'owner' });
    expect(staffRule(support, ownerRow, 'change_roles', { nextRoles: [Role.RestaurantAdmin, Role.Waiter] })).toEqual({ allowed: true });
    expect(staffRule(support, ownerRow, 'archive')).toEqual({ allowed: false, why: 'owner' });
    expect(staffRule(support, ownerRow, 'set_active')).toEqual({ allowed: false, why: 'owner' });
    expect(staffRule(support, ownerRow, 'reset_password')).toEqual({ allowed: true });
  });
  it('ownership goes to an active member and swaps the lead roles', () => {
    const member = { ...waiter, active: true, archived: false };
    expect(canTransferOwnership(ownerRow, member)).toBe(true);
    expect(canTransferOwnership(ownerRow, { ...member, active: false })).toBe(false);
    expect(canTransferOwnership(ownerRow, { ...member, archived: true })).toBe(false);
    expect(canTransferOwnership(ownerRow, { ...ownerRow, active: true, archived: false })).toBe(false);
    expect(ownershipRoles([Role.Manager, Role.Cashier], 'owner')).toEqual([Role.RestaurantAdmin, Role.Cashier]);
    expect(ownershipRoles([Role.RestaurantAdmin, Role.Waiter], 'former')).toEqual([Role.Manager, Role.Waiter]);
  });
});

describe('order status steps', () => {
  it('goes back one step and never past sent or out of a closed status', () => {
    expect(previousOrderStatus('ready')).toBe('preparing');
    expect(previousOrderStatus('received')).toBe('sent');
    expect(previousOrderStatus('sent')).toBeNull();
    expect(previousOrderStatus('cancelled')).toBeNull();
  });
  it('rolesOf reads tokens issued with a single role', () => {
    expect(rolesOf({ role: Role.Waiter })).toEqual([Role.Waiter]);
    expect(rolesOf({ roles: [Role.Kitchen, Role.Cashier] })).toEqual([Role.Kitchen, Role.Cashier]);
  });
});

describe('formatDuration', () => {
  it('picks the unit that reads best', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(42)).toBe('42 s');
    expect(formatDuration(185)).toBe('3 min');
    expect(formatDuration(3900)).toBe('1 h 05 min');
  });
});

describe('permissions', () => {
  it('adds what each permission depends on', () => {
    expect(withRequired(['payments.record'])).toEqual(['restaurants.view', 'payments.view', 'payments.record']);
    expect(withRequired(['team.manage'])).toEqual(['team.manage']);
  });
  it('reads the names used before the split', () => {
    expect(upgradePermissions(['subscriptions', 'access_control'])).toEqual([
      'restaurants.view',
      'restaurants.suspend',
      'payments.view',
      'payments.record',
    ]);
    expect(upgradePermissions(['settings', 'restaurants.view'])).toEqual(['restaurants.view', 'team.manage']);
  });
  it('only the superadmin grants deletion; others grant what they hold', () => {
    expect(canGrant({ superadmin: true, permissions: [] }, 'restaurants.delete')).toBe(true);
    expect(canGrant({ superadmin: false, permissions: ['restaurants.delete'] }, 'restaurants.delete')).toBe(false);
    expect(canGrant({ superadmin: false, permissions: ['payments.view'] }, 'payments.view')).toBe(true);
    expect(canGrant({ superadmin: false, permissions: ['payments.view'] }, 'payments.record')).toBe(false);
  });
});

describe('field validation', () => {
  it('phones: landline and mobile, with or without +55', () => {
    expect(brazilPhone('11912345678')).toBe('(11) 91234-5678');
    expect(brazilPhone('+55 (11) 4000-1234')).toBe('(11) 4000-1234');
    expect(brazilPhone('11812345678')).toBeNull();
    expect(brazilPhone('1234')).toBeNull();
    expect(brazilPhone('(01) 4000-1234')).toBeNull();
  });
  it('instagram: handle or profile link, normalized', () => {
    expect(instagramHandle('@Casa.Verde')).toBe('casa.verde');
    expect(instagramHandle('https://instagram.com/casaverde/')).toBe('casaverde');
    expect(instagramHandle('casa..verde')).toBeNull();
    expect(instagramHandle('casa verde')).toBeNull();
  });
  it('names and contacts', () => {
    expect(personName('  Maria   da Silva ')).toBe('Maria da Silva');
    expect(personName("João D'Ávila")).toBe("João D'Ávila");
    expect(personName('Maria2')).toBeNull();
    expect(contact('gerente@casa.com')).toBe('gerente@casa.com');
    expect(contact('11 91234-5678')).toBe('(11) 91234-5678');
    expect(contact('gerente@')).toBeNull();
  });
  it('masks a phone as it is typed', () => {
    expect(maskPhone('119')).toBe('(11) 9');
    expect(maskPhone('1191234567')).toBe('(11) 9123-4567');
    expect(maskPhone('11912345678')).toBe('(11) 91234-5678');
  });
});

describe('alerts', () => {
  it('turns realtime events into alerts for the right roles', () => {
    expect(alertOf('table.updated', { id: 't', name: 'Mesa 7', state: 'pending_open' })).toEqual({ kind: 'open_request', table: 'Mesa 7', tag: 'open:t' });
    expect(alertOf('table.updated', { id: 't', name: 'Mesa 7', state: 'open' })).toBeNull();
    expect(alertOf('order.updated', { id: 'o', tableName: 'Mesa 2', status: 'preparing' })).toBeNull();
    expect(alertOf('order.cancelled', { id: 'o', tableName: 'Mesa 2', alertKitchen: false })).toBeNull();
    expect(alertsRole('new_order', ['kitchen', 'cashier'])).toBe(true);
    expect(alertsRole('call', ['kitchen'])).toBe(false);
    expect(alertsRole('bill_request', ['cashier'])).toBe(true);
  });
});
