import { accessState } from './subscription';
import { contractProblems, contractState, contractStatus, type ContractView, coverage, effectiveEnds } from './contracts';

const doc = { id: 'd', kind: 'contract' as const, name: 'c.pdf', mime: 'application/pdf', bytes: 1, createdAt: '' };
let n = 0;
const c = (kind: 'pilot' | 'definitive', origin: ContractView['origin'], startsOn: string, endsOn: string, previousId: string | null = null): ContractView => ({
  id: `c${++n}`, kind, origin, previousId, signedOn: startsOn, startsOn, endsOn, effectiveEndsOn: endsOn,
  signatory: { name: 'Rita', role: 'Sócia', contact: '11977777777' }, document: doc, createdByName: 'Elo', createdAt: `2026-0${n}-01T00:00:00Z`,
});

describe('contracts', () => {
  it('is pending without a contract or before it starts, active while it runs, ended after', () => {
    expect(contractState(null, '2026-10-31')).toBe('pending');
    expect(contractState({ startsOn: '2026-11-01', endsOn: '2027-10-31' }, '2026-10-31')).toBe('pending');
    expect(contractState({ startsOn: '2026-01-01', endsOn: '2026-10-31' }, '2026-10-31')).toBe('active');
    expect(contractState({ startsOn: '2026-01-01', endsOn: '2026-10-30' }, '2026-10-31')).toBe('ended');
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
});
