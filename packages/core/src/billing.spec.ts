import { addMonths, dateOnly, dueDateProblems, paymentPeriod, paymentProblems, paymentSummary, suspensionReasons, toDay } from './billing';

const day = (s: string) => dateOnly(s)!;

describe('dateOnly', () => {
  it('reads real days at noon UTC', () => {
    expect(day('2026-02-28').toISOString()).toBe('2026-02-28T12:00:00.000Z');
  });
  it('rejects impossible or malformed days', () => {
    expect(dateOnly('2026-02-30')).toBeNull();
    expect(dateOnly('30/01/2026')).toBeNull();
  });
});

describe('addMonths', () => {
  it('keeps the billing day', () => {
    expect(toDay(addMonths(day('2026-03-10'), 1))).toBe('2026-04-10');
    expect(toDay(addMonths(day('2026-11-10'), 3))).toBe('2027-02-10');
  });
  it('falls back to the last day of shorter months', () => {
    expect(toDay(addMonths(day('2026-01-31'), 1))).toBe('2026-02-28');
    expect(toDay(addMonths(day('2028-01-31'), 1))).toBe('2028-02-29');
  });
});

describe('paymentPeriod', () => {
  it('continues from the due date while active or in grace', () => {
    const p = paymentPeriod({ dueDate: day('2026-05-10'), paidAt: day('2026-05-12'), cycles: 2, cycleMonths: 1, now: day('2026-05-12') });
    expect([toDay(p.start), toDay(p.end), p.restartsFromPayment]).toEqual(['2026-05-10', '2026-07-10', false]);
  });
  it('restarts from the payment date once suspended for being overdue', () => {
    const p = paymentPeriod({ dueDate: day('2026-01-11'), paidAt: day('2026-10-30'), cycles: 1, cycleMonths: 1, now: day('2026-10-30') });
    expect([toDay(p.start), toDay(p.end), p.restartsFromPayment]).toEqual(['2026-10-30', '2026-11-30', true]);
  });
});

describe('paymentProblems', () => {
  const ok = { paidAt: day('2026-10-30'), restaurantCreatedAt: day('2026-10-01'), cycles: 1, amountCents: 9900, expectedCents: 9900, now: day('2026-10-30') };
  it('accepts the expected payment', () => expect(paymentProblems(ok)).toEqual([]));
  it('refuses future and pre-creation dates', () => {
    expect(paymentProblems({ ...ok, paidAt: day('2026-11-02') })).toContain('paid_in_future');
    expect(paymentProblems({ ...ok, paidAt: day('2026-09-01') })).toContain('paid_before_creation');
  });
  it('limits cycles and amount', () => {
    expect(paymentProblems({ ...ok, cycles: 13 })).toContain('cycles_out_of_range');
    expect(paymentProblems({ ...ok, amountCents: 0, note: 'x' })).toContain('amount_out_of_range');
    expect(paymentProblems({ ...ok, amountCents: 99_001, note: 'x' })).toContain('amount_out_of_range');
  });
  it('needs a note when the amount differs from the plan', () => {
    expect(paymentProblems({ ...ok, amountCents: 6500 })).toEqual(['note_required']);
    expect(paymentProblems({ ...ok, amountCents: 6500, note: 'Desconto de lançamento' })).toEqual([]);
  });
});

describe('dueDateProblems', () => {
  it('needs a future day and a reason', () => {
    expect(dueDateProblems({ dueDate: day('2026-10-29'), reason: '', now: day('2026-10-30') })).toEqual(['due_in_past', 'reason_required']);
    expect(dueDateProblems({ dueDate: day('2026-10-30'), reason: 'Data digitada errada', now: day('2026-10-30') })).toEqual([]);
  });
});

describe('suspensionReasons', () => {
  it('tells manual and overdue suspension apart', () => {
    const now = day('2026-10-30');
    expect(suspensionReasons(day('2026-11-10'), false, now)).toEqual([]);
    expect(suspensionReasons(day('2026-11-10'), true, now)).toEqual(['manual']);
    expect(suspensionReasons(day('2026-01-11'), true, now)).toEqual(['manual', 'overdue']);
  });
});

describe('payment receipts', () => {
  const base = { paidAt: new Date('2026-10-10T12:00:00Z'), restaurantCreatedAt: new Date('2026-09-01T12:00:00Z'), cycles: 1, amountCents: 9900, expectedCents: 9900, now: new Date('2026-10-20T12:00:00Z') };
  it('asks for the proof or a reason, never both', () => {
    expect(paymentProblems({ ...base, receipt: {} })).toEqual(['receipt_required']);
    expect(paymentProblems({ ...base, receipt: { noReceiptReason: 'ok' } })).toEqual(['receipt_required']);
    expect(paymentProblems({ ...base, receipt: { noReceiptReason: 'Pago em dinheiro' } })).toEqual([]);
    expect(paymentProblems({ ...base, receipt: { documentId: 'd1' } })).toEqual([]);
    expect(paymentProblems({ ...base, receipt: { documentId: 'd1', noReceiptReason: 'Pago em dinheiro' } })).toEqual(['receipt_or_reason']);
    expect(paymentProblems(base)).toEqual([]);
  });
});

describe('paymentSummary', () => {
  const restaurant = { createdAt: '2026-05-10T12:00:00.000Z', initialDueDate: '2026-06-10T12:00:00.000Z' };
  const pay = (paidAt: string, start: string, end: string, extra: Partial<{ voidedAt: string }> = {}) => ({
    kind: 'payment' as const, amountCents: 9900, paidAt, periodStart: start, newDueDate: end, voidedAt: null, createdAt: paidAt, ...extra,
  });
  const now = new Date('2026-10-20T12:00:00Z');
  it('counts totals, punctuality and delay from the due date each payment settled', () => {
    const s = paymentSummary([
      pay('2026-06-08T12:00:00.000Z', '2026-06-10T12:00:00.000Z', '2026-07-10T12:00:00.000Z'),
      pay('2026-07-15T12:00:00.000Z', '2026-07-10T12:00:00.000Z', '2026-08-10T12:00:00.000Z'),
      pay('2026-08-01T12:00:00.000Z', '2026-08-10T12:00:00.000Z', '2026-09-10T12:00:00.000Z', { voidedAt: '2026-08-02T12:00:00.000Z' }),
    ], restaurant, now);
    expect(s).toMatchObject({ totalCents: 19800, payments: 2, onTimePct: 50, avgDelayDays: 2.5, lastPaidAt: '2026-07-15T12:00:00.000Z' });
    const states = Object.fromEntries(s.months.map((m) => [m.month, m.state]));
    expect(states).toMatchObject({ '2026-04': 'before', '2026-05': 'trial', '2026-06': 'paid_on_time', '2026-07': 'paid_late', '2026-09': 'uncovered', '2026-10': 'uncovered' });
    expect(s.months).toHaveLength(12);
  });
  it('makes sense without payments', () => {
    const s = paymentSummary([], restaurant, new Date('2026-05-20T12:00:00Z'));
    expect(s).toMatchObject({ totalCents: 0, payments: 0, onTimePct: null, avgDelayDays: null, lastPaidAt: null });
    expect(s.months.at(-1)).toEqual({ month: '2026-05', state: 'trial' });
  });
});
