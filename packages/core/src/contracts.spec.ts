import { accessState, restaurantStatus } from './subscription';
import { suspensionReasons } from './billing';
import { billedDueDate, rebasedPayments, billingProblem, planInForce, businessDay, contractProblems, contractState, contractStatus, type ContractView, coverage, effectiveEnds, latestContract, trialStatus } from './contracts';

const doc = { id: 'd', kind: 'contract' as const, name: 'c.pdf', mime: 'application/pdf', bytes: 1, createdAt: '' };
let n = 0;
const c = (kind: 'pilot' | 'definitive', origin: ContractView['origin'], startsOn: string, endsOn: string, previousId: string | null = null): ContractView => ({
  id: `c${++n}`, kind, origin, previousId, signedOn: startsOn, startsOn, endsOn, effectiveEndsOn: endsOn, trialDays: 0, trialEndedOn: null, trialEndReason: null, voided: null, plan: null,
  signatory: { name: 'Rita', role: 'Sócia', contact: '11977777777' }, document: doc, createdByName: 'Elo', createdAt: `2026-0${n}-01T00:00:00Z`,
});

describe('contracts', () => {
  it('is pending without a contract or before it starts, active while it runs, ended after', () => {
    expect(contractState([], '2026-10-31')).toBe('pending');
    expect(contractState([c('pilot', 'initial', '2026-11-01', '2027-10-31')], '2026-10-31')).toBe('pending');
    expect(contractState([c('pilot', 'initial', '2026-01-01', '2026-10-31')], '2026-10-31')).toBe('active');
    expect(contractState([c('pilot', 'initial', '2026-01-01', '2026-10-30')], '2026-10-31')).toBe('ended');
    expect(accessState(new Date('2027-01-01'), new Date('2026-10-31'), false, 'pending')).toBe('suspended');
  });

  it('a conversion ends the pilot the day before; a renewal keeps the stretch going', () => {
    const pilot = c('pilot', 'initial', '2026-08-01', '2026-11-30');
    const def = c('definitive', 'conversion', '2026-10-15', '2027-10-14', pilot.id);
    expect(effectiveEnds([pilot, def]).get(pilot.id)).toBe('2026-10-14');
    const renewal = c('definitive', 'renewal', '2027-10-15', '2028-10-14', def.id);
    expect(coverage([pilot, def, renewal], '2026-10-31')).toEqual({ startsOn: '2026-08-01', endsOn: '2028-10-14' });
    const s = contractStatus([pilot, { ...def, effectiveEndsOn: def.endsOn }], '2026-10-31');
    expect(s).toMatchObject({ state: 'active', endsOn: '2027-10-14' });
    expect(s.current?.id).toBe(def.id);
  });

  it('refuses contracts that make no sense', () => {
    const pilot = { ...c('pilot', 'initial', '2026-08-01', '2026-11-30') };
    const today = '2026-10-31';
    const base = { kind: 'definitive' as const, signedOn: today, startsOn: '2026-11-01', endsOn: '2027-10-31' };
    expect(contractProblems({ ...base, origin: 'initial', signedOn: '2026-11-05' }, [], today)).toEqual(['signed_in_future']);
    expect(contractProblems({ ...base, origin: 'initial', endsOn: '2026-10-01' }, [], today)).toEqual(['ends_before_start']);
    expect(contractProblems({ ...base, origin: 'initial', endsOn: '2032-01-01' }, [], today)).toEqual(['too_long']);
    expect(contractProblems({ ...base, origin: 'initial' }, [pilot], today)).toEqual(['already_has_contract']);
    expect(contractProblems({ ...base, origin: 'renewal' }, [], today)).toEqual(['nothing_to_renew']);
    expect(contractProblems({ ...base, origin: 'renewal' }, [pilot], today)).toEqual(['overlaps']);
    expect(contractProblems({ ...base, origin: 'renewal', startsOn: '2026-12-01', endsOn: '2027-11-30' }, [pilot], today)).toEqual([]);
    expect(contractProblems({ ...base, origin: 'conversion' }, [pilot], today)).toEqual([]);
    expect(contractProblems({ ...base, origin: 'conversion', kind: 'pilot' }, [pilot], today)).toEqual(['conversion_is_definitive']);
    expect(contractProblems({ ...base, origin: 'conversion', startsOn: '2027-01-05', endsOn: '2028-01-04' }, [pilot], today)).toEqual(['nothing_to_convert']);
  });

  it('a renewal after a gap starts on its own day, without anything being recomputed', () => {
    const a = c('definitive', 'initial', '2026-01-01', '2026-10-31');
    const b = c('definitive', 'renewal', '2026-11-10', '2027-11-09', a.id);
    expect(contractState([a, b], '2026-10-31')).toBe('active');
    const gap = contractStatus([a, b], '2026-11-05');
    expect(gap).toMatchObject({ state: 'ended', endsOn: '2026-10-31', nextStartsOn: '2026-11-10' });
    expect(contractState([a, b], '2026-11-10')).toBe('active');
  });

  it('ignores voided contracts, and a voided conversion gives the pilot its days back', () => {
    const pilot = c('pilot', 'initial', '2026-08-01', '2026-11-30');
    const def = { ...c('definitive', 'conversion', '2026-10-15', '2027-10-14', pilot.id), voidedAt: '2026-10-20T00:00:00Z' };
    expect(effectiveEnds([pilot, def]).get(pilot.id)).toBe('2026-11-30');
    expect(latestContract([pilot, def])?.id).toBe(pilot.id);
    expect(contractProblems({ kind: 'definitive', origin: 'conversion', signedOn: '2026-10-20', startsOn: '2026-10-20', endsOn: '2027-10-19' }, [pilot, def], '2026-10-31')).toEqual([]);
  });

  it('a voided contract as the API lists it (with `voided`) is not the current one', () => {
    const pilot = c('pilot', 'initial', '2026-10-31', '2026-11-06');
    const def = { ...c('definitive', 'conversion', '2026-10-31', '2027-10-30', pilot.id), voided: { at: '2026-10-31T19:33:00Z', byName: 'Elo', reason: 'datas erradas' } };
    const status = contractStatus([def, pilot], '2026-11-02');
    expect(status.current?.id).toBe(pilot.id);
    expect(status).toMatchObject({ state: 'active', endsOn: '2026-11-06', daysLeft: 4 });
    expect(latestContract([def, pilot])?.id).toBe(pilot.id);
    expect(contractStatus([{ ...pilot, voided: def.voided }], '2026-11-02')).toMatchObject({ state: 'pending', current: null });
  });

  it('billing stops between contracts: credit carries over, debt stays, gaps before the base do not count', () => {
    const first = c('definitive', 'initial', '2026-01-01', '2026-06-30');
    const renewal = c('definitive', 'renewal', '2026-08-01', '2027-07-31', first.id);
    const terms = [first, renewal];
    // paid up to 15/07, inside the gap: 15 days of credit start with the renewal
    expect(billedDueDate({ due: '2026-07-15', base: '2026-06-15' }, terms)).toBe('2026-08-15');
    // paid exactly to the end: due on the renewal's first day
    expect(billedDueDate({ due: '2026-07-01', base: '2026-06-01' }, terms)).toBe('2026-08-01');
    // debt of covered days stays where it is
    expect(billedDueDate({ due: '2026-06-10', base: '2026-05-10' }, terms)).toBe('2026-06-10');
    // a payment made after the gap does not move again
    expect(billedDueDate({ due: '2026-09-15', base: '2026-08-15' }, terms)).toBe('2026-09-15');
    // a debt paid across the gap is pushed by it
    expect(billedDueDate({ due: '2026-07-10', base: '2026-06-10' }, terms)).toBe('2026-08-10');
    // two gaps
    const third = c('definitive', 'renewal', '2027-09-01', '2028-08-31', renewal.id);
    expect(billedDueDate({ due: '2026-07-15', base: '2026-06-15' }, [...terms, third])).toBe('2026-08-15');
    expect(billedDueDate({ due: '2027-08-10', base: '2026-06-15' }, [first, { ...renewal, endsOn: '2027-07-31' }, third])).toBe('2027-10-11');
  });

  it('records payments only with a contract, or to settle debt or ahead of a renewal', () => {
    expect(billingProblem({ state: 'pending', endsOn: null, nextStartsOn: null }, '2026-01-01')).toBe('contract_pending');
    expect(billingProblem({ state: 'ended', endsOn: '2026-06-30', nextStartsOn: null }, '2026-07-10')).toBe('nothing_owed');
    expect(billingProblem({ state: 'ended', endsOn: '2026-06-30', nextStartsOn: null }, '2026-06-10')).toBeNull();
    expect(billingProblem({ state: 'ended', endsOn: '2026-06-30', nextStartsOn: '2026-08-01' }, '2026-07-10')).toBeNull();
    expect(billingProblem({ state: 'active', endsOn: '2026-06-30', nextStartsOn: null }, '2026-09-10')).toBeNull();
  });

  it('charges the plan signed in the contract in force, until an amendment after it', () => {
    const basic = { id: 'p1', name: 'Mensal', priceCents: 3790, cycleMonths: 1 };
    const pro = { id: 'p2', name: 'Pro', priceCents: 5990, cycleMonths: 1 };
    const first = { ...c('definitive', 'initial', '2026-01-01', '2026-12-31'), plan: basic, createdAt: '2026-01-01T00:00:00Z' };
    const renewal = { ...c('definitive', 'renewal', '2027-01-01', '2027-12-31', first.id), plan: pro, createdAt: '2026-11-01T00:00:00Z' };
    expect(planInForce([first], '2025-12-31', null)).toBeNull();
    expect(planInForce([first, renewal], '2026-06-01', null)).toEqual(basic);
    expect(planInForce([first, renewal], '2027-02-01', null)).toEqual(pro);
    const amendment = { ...pro, id: 'p3', name: 'Promo', priceCents: 2990, at: '2099-01-01T00:00:00Z' };
    expect(planInForce([first, renewal], '2026-06-01', amendment)?.priceCents).toBe(2990);
    expect(planInForce([first, renewal], '2026-06-01', { ...amendment, at: '2000-01-01T00:00:00Z' })).toEqual(basic);
    // after the end, a debt is charged at the last contract's price
    expect(planInForce([first], '2027-03-01', null)).toEqual(basic);
  });

  it('only a first pilot carries a trial, and the signature cannot come after the end', () => {
    const base = { signedOn: '2026-10-01', startsOn: '2026-10-01', endsOn: '2027-09-30' };
    expect(contractProblems({ ...base, kind: 'definitive', origin: 'initial', trialDays: 7 }, [], '2026-10-31')).toEqual(['trial_only_initial_pilot']);
    expect(contractProblems({ ...base, kind: 'pilot', origin: 'initial', trialDays: 7 }, [], '2026-10-31')).toEqual([]);
    expect(contractProblems({ ...base, kind: 'pilot', origin: 'initial', signedOn: '2026-10-01', startsOn: '2026-01-01', endsOn: '2026-06-30' }, [], '2026-10-31')).toEqual(['signed_after_end']);
  });

  it('follows the trial: scheduled, running, finished, ended early or by the conversion', () => {
    const pilot = { ...c('pilot', 'initial', '2026-10-01', '2027-09-30'), trialDays: 14 };
    expect(trialStatus([pilot], '2026-09-30')).toMatchObject({ state: 'scheduled' });
    expect(trialStatus([pilot], '2026-10-05')).toMatchObject({ state: 'running', endsOn: '2026-10-14', billingStartsOn: '2026-10-15', daysLeft: 9 });
    expect(trialStatus([pilot], '2026-10-15')).toMatchObject({ state: 'finished' });
    const early = { ...pilot, trialEndedOn: '2026-10-08', trialEndReason: 'early' as const };
    expect(trialStatus([early], '2026-10-09')).toMatchObject({ state: 'ended_early', endsOn: '2026-10-07', billingStartsOn: '2026-10-08' });
    const converted = { ...pilot, trialEndedOn: '2026-10-10', trialEndReason: 'conversion' as const };
    expect(trialStatus([converted], '2026-10-12')).toMatchObject({ state: 'ended_by_conversion', billingStartsOn: '2026-10-10' });
    expect(trialStatus([c('definitive', 'initial', '2026-10-01', '2027-09-30')], '2026-10-05')).toMatchObject({ state: 'none', billingStartsOn: '2026-10-01' });
  });

  it('gives one status per restaurant and no overdue while there is no contract', () => {
    const past = new Date('2026-01-01');
    expect(restaurantStatus({ contract: 'pending', dueDate: past, suspended: false }, new Date('2026-10-31'))).toBe('pending');
    expect(restaurantStatus({ contract: 'ended', dueDate: past, suspended: true }, new Date('2026-10-31'))).toBe('ended');
    expect(restaurantStatus({ contract: 'active', dueDate: past, suspended: false }, new Date('2026-10-31'))).toBe('suspended');
    expect(restaurantStatus({ contract: 'active', dueDate: new Date('2026-10-28'), suspended: false }, new Date('2026-10-31'))).toBe('grace');
    expect(suspensionReasons(past, false, new Date('2026-10-31'), 'pending')).toEqual(['contract_pending']);
  });

  it('reads the business day in Brasília, not in UTC', () => {
    expect(businessDay(new Date('2026-11-01T01:30:00Z'))).toBe('2026-10-31');
    expect(businessDay(new Date('2026-11-01T03:30:00Z'))).toBe('2026-11-01');
  });

  it('payments follow the first billed day when the trial moves, up to the first entry that does not continue them', () => {
    const terms = [c('definitive', 'initial', '2026-01-01', '2028-12-31')];
    const pay = (id: string, periodStart: string, newDueDate: string) => ({ id, kind: 'payment' as const, periodStart, newDueDate });
    const entries = [pay('a', '2026-12-01', '2027-01-01'), pay('b', '2027-01-01', '2027-03-01'), { id: 'adj', kind: 'adjustment' as const, periodStart: null, newDueDate: '2027-06-01' }, pay('c', '2027-06-01', '2027-07-01')];
    expect(rebasedPayments(entries, '2026-12-01', '2026-11-02', terms)).toEqual(
      new Map([
        ['a', { periodStart: '2026-11-02', newDueDate: '2026-12-02' }],
        ['b', { periodStart: '2026-12-02', newDueDate: '2027-02-02' }],
      ]),
    );
    expect(rebasedPayments(entries, '2026-12-01', '2026-12-01', terms).size).toBe(0);
    // a restart after a suspension is not a continuation: nothing moves
    expect(rebasedPayments([pay('r', '2027-02-10', '2027-03-10')], '2026-12-01', '2026-11-02', terms).size).toBe(0);
    // a month-end start keeps the length in months
    expect(rebasedPayments([pay('m', '2026-12-31', '2027-01-31')], '2026-12-31', '2026-01-31', terms).get('m')).toEqual({ periodStart: '2026-01-31', newDueDate: '2026-02-28' });
  });
});
