import { addMonths, dateOnly, dueDateProblems, paymentPeriod, paymentProblems, suspensionReasons, toDay } from './billing';

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
