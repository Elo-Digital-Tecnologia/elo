import { daysBetween, fillDays, fillHours } from './report-shape';

describe('report shape', () => {
  it('fills days without sales, across month boundaries', () => {
    const out = fillDays('2026-02-27', '2026-03-02', [{ date: '2026-03-01', revenueCents: 500, orders: 2 }]);
    expect(out.map((d) => d.date)).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
    expect(out[2]).toEqual({ date: '2026-03-01', revenueCents: 500, orders: 2 });
    expect(out[0]).toEqual({ date: '2026-02-27', revenueCents: 0, orders: 0 });
  });
  it('always returns 24 hours', () => {
    const out = fillHours([{ hour: 20, orders: 3 }]);
    expect(out).toHaveLength(24);
    expect(out[20].orders).toBe(3);
  });
  it('counts days inclusive', () => {
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-01-01', '2026-12-31')).toBe(365);
  });
});
