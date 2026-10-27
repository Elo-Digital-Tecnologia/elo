import { accessState } from './subscription';

const due = new Date('2026-01-10T00:00:00Z');
const day = (n: number) => new Date(due.getTime() + n * 86_400_000);

describe('accessState', () => {
  it('active before and on due date', () => {
    expect(accessState(due, day(-1))).toBe('active');
    expect(accessState(due, day(0))).toBe('active');
  });
  it('grace up to day 7', () => {
    expect(accessState(due, day(1))).toBe('grace');
    expect(accessState(due, day(7))).toBe('grace');
  });
  it('suspended after day 7', () => {
    expect(accessState(due, new Date(day(7).getTime() + 1))).toBe('suspended');
  });
  it('manual suspension wins', () => {
    expect(accessState(due, day(-5), true)).toBe('suspended');
  });
});
