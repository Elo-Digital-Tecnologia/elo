import type { DocumentView } from './billing';

export const ContractKind = { Pilot: 'pilot', Definitive: 'definitive' } as const;
export type ContractKind = (typeof ContractKind)[keyof typeof ContractKind];

/** How a contract came to be: the first one, a pilot turned definitive, or a renewal. */
export const ContractOrigin = { Initial: 'initial', Conversion: 'conversion', Renewal: 'renewal' } as const;
export type ContractOrigin = (typeof ContractOrigin)[keyof typeof ContractOrigin];

export const CONTRACT_KIND_LABEL: Record<ContractKind, string> = { pilot: 'Piloto', definitive: 'Definitivo' };
export const CONTRACT_ORIGIN_LABEL: Record<ContractOrigin, string> = { initial: 'Primeiro contrato', conversion: 'Conversão em definitivo', renewal: 'Renovação' };

export const CONTRACT_LIMITS = {
  /** Longest term accepted for one contract. */
  maxYears: 5,
  /** The Elo panel warns about contracts ending within this many days. */
  warnDays: 30,
} as const;

export interface ContractView {
  id: string;
  kind: ContractKind;
  origin: ContractOrigin;
  previousId: string | null;
  /** Calendar days, YYYY-MM-DD. */
  signedOn: string;
  startsOn: string;
  endsOn: string;
  /** Last day it really covers: a pilot converted early stops the day before the definitive one starts. */
  effectiveEndsOn: string;
  signatory: { name: string; role: string; contact: string };
  document: DocumentView;
  createdByName: string;
  createdAt: string;
}

export type ContractState = 'pending' | 'active' | 'ended';

/** Fields that decide the coverage of a contract. */
export interface ContractTerm {
  id: string;
  origin: ContractOrigin;
  previousId: string | null;
  startsOn: string;
  endsOn: string;
  createdAt: string | Date;
}

const DAY = 86_400_000;
const shift = (day: string, days: number) => new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);
export const addYears = (day: string, years: number) => `${Number(day.slice(0, 4)) + years}${day.slice(4)}`;

/** The last day each contract covers, once later conversions cut their pilots short. */
export function effectiveEnds(terms: ContractTerm[]): Map<string, string> {
  const ends = new Map(terms.map((t) => [t.id, t.endsOn]));
  for (const t of terms) {
    if (t.origin !== 'conversion' || !t.previousId || !ends.has(t.previousId)) continue;
    const cut = shift(t.startsOn, -1);
    if (cut < ends.get(t.previousId)!) ends.set(t.previousId, cut);
  }
  return ends;
}

/**
 * The stretch of days covered without a gap that matters today: the one running
 * now, else the next one to start, else the last one that ended. It is what the
 * restaurant row keeps (`contract_starts_on`/`contract_ends_on`) for fast checks.
 */
export function coverage(terms: ContractTerm[], today: string): { startsOn: string; endsOn: string } | null {
  const ends = effectiveEnds(terms);
  const spans = terms
    .map((t) => ({ startsOn: t.startsOn, endsOn: ends.get(t.id)! }))
    .filter((s) => s.startsOn <= s.endsOn)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  const merged: { startsOn: string; endsOn: string }[] = [];
  for (const s of spans) {
    const last = merged.at(-1);
    if (last && s.startsOn <= shift(last.endsOn, 1)) last.endsOn = s.endsOn > last.endsOn ? s.endsOn : last.endsOn;
    else merged.push({ ...s });
  }
  return merged.find((m) => m.startsOn <= today && today <= m.endsOn) ?? merged.find((m) => m.startsOn > today) ?? merged.at(-1) ?? null;
}

/** Pending (no contract yet, or it has not started), active, or ended without a renewal. */
export function contractState(span: { startsOn: string | null; endsOn: string | null } | null, today: string): ContractState {
  if (!span?.startsOn || !span.endsOn || span.startsOn > today) return 'pending';
  return today <= span.endsOn ? 'active' : 'ended';
}

export interface ContractStatus {
  state: ContractState;
  /** The contract covering today (or the latest one). */
  current: ContractView | null;
  /** Last covered day of the running stretch, renewals included. */
  endsOn: string | null;
  daysLeft: number | null;
}

/** What the Elo panel shows about a restaurant's contracts. */
export function contractStatus(contracts: ContractView[], today: string): ContractStatus {
  const span = coverage(contracts, today);
  const state = contractState(span, today);
  const current =
    contracts.filter((c) => c.startsOn <= today && today <= c.effectiveEndsOn).sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0] ??
    [...contracts].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] ??
    null;
  return {
    state,
    current,
    endsOn: span?.endsOn ?? null,
    daysLeft: state === 'active' && span ? Math.round((Date.parse(`${span.endsOn}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / DAY) : null,
  };
}

export type ContractProblem = 'signed_in_future' | 'ends_before_start' | 'too_long' | 'already_has_contract' | 'nothing_to_renew' | 'overlaps' | 'nothing_to_convert' | 'conversion_is_definitive';

/**
 * What is wrong with a contract about to be registered, empty when it can be saved.
 * The first one needs no history; a renewal starts after the latest contract ends;
 * a conversion turns the latest pilot into a definitive contract.
 */
export function contractProblems(
  input: { kind: ContractKind; origin: ContractOrigin; signedOn: string; startsOn: string; endsOn: string },
  existing: (ContractTerm & { kind: ContractKind })[],
  today: string,
): ContractProblem[] {
  const problems: ContractProblem[] = [];
  if (input.signedOn > today) problems.push('signed_in_future');
  if (input.endsOn < input.startsOn) problems.push('ends_before_start');
  else if (input.endsOn > addYears(input.startsOn, CONTRACT_LIMITS.maxYears)) problems.push('too_long');
  const latest = [...existing].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  const ends = effectiveEnds(existing);
  if (input.origin === 'initial' && latest) problems.push('already_has_contract');
  if (input.origin === 'renewal') {
    if (!latest) problems.push('nothing_to_renew');
    else if (input.startsOn <= ends.get(latest.id)!) problems.push('overlaps');
  }
  if (input.origin === 'conversion') {
    if (input.kind !== 'definitive') problems.push('conversion_is_definitive');
    if (!latest || latest.kind !== 'pilot' || input.startsOn < latest.startsOn || shift(input.startsOn, -1) > ends.get(latest.id)!) problems.push('nothing_to_convert');
  }
  return problems;
}
