import type { DocumentView } from '../billing/billing.js';
import { addMonths, dateOnly, toDay } from '../billing/billing.js';
import { MS_PER_DAY } from '../time/time-units.js';

export const ContractKind = { PILOT: 'pilot', DEFINITIVE: 'definitive' } as const;
export type ContractKind = (typeof ContractKind)[keyof typeof ContractKind];

/** How a contract came to be: the first one, a pilot turned definitive, or a renewal. */
export const ContractOrigin = {
    INITIAL: 'initial',
    CONVERSION: 'conversion',
    RENEWAL: 'renewal'
} as const;
export type ContractOrigin = (typeof ContractOrigin)[keyof typeof ContractOrigin];
export const CONTRACT_LIMITS = {
    /** Longest term accepted for one contract. */
    maxYears: 5,
    /** The Elo panel warns about contracts ending within this many days. */
    warnDays: 30
} as const;

/** Why a pilot's free trial stopped before its last day. */
export type TrialEndReason = 'early' | 'conversion';

/** What a contract (or an amendment) charges: kept as signed, whatever the plan costs later. */
export interface BillingPlan {
    id: string | null;
    name: string;
    priceCents: number;
    cycleMonths: number;
}

export interface ContractView {
    id: string;
    /** Plan and price signed in this contract; null on contracts registered before plans were part of them. */
    plan: BillingPlan | null;
    kind: ContractKind;
    origin: ContractOrigin;
    previousId: string | null;
    /** Calendar days, YYYY-MM-DD. */
    signedOn: string;
    startsOn: string;
    endsOn: string;
    /** Last day it really covers: a pilot converted early stops the day before the definitive one starts. */
    effectiveEndsOn: string;
    /** Free days of a first pilot contract, 0 otherwise. */
    trialDays: number;
    trialEndedOn: string | null;
    trialEndReason: TrialEndReason | null;
    signatory: { name: string; role: string; contact: string };
    document: DocumentView;
    createdByName: string | null;
    createdAt: string;
    /** A contract registered by mistake: kept in the history, ignored by every rule. */
    voided: { at: string; byName: string; reason: string } | null;
}

export type ContractState = 'pending' | 'active' | 'ended';

/** Fields that decide the coverage of a contract. */
export interface ContractTerm {
    id: string;
    kind?: ContractKind;
    origin: ContractOrigin;
    previousId: string | null;
    startsOn: string;
    endsOn: string;
    createdAt: string | Date;
    trialDays?: number;
    trialEndedOn?: string | null;
    trialEndReason?: TrialEndReason | null;
    /** Plan signed in the contract: the API rows carry the loose columns, the views `plan`. */
    plan?: BillingPlan | null;
    planId?: string | null;
    planName?: string | null;
    priceCents?: number | null;
    cycleMonths?: number | null;
    /** Set when the contract was voided; such contracts count for nothing. The API rows carry `voidedAt`, the views `voided`. */
    voidedAt?: string | Date | null;
    voided?: { at: string } | null;
}

export const shiftDay = (day: string, days: number) =>
    new Date(Date.parse(`${day}T12:00:00Z`) + days * MS_PER_DAY)
        .toISOString()
        .slice(0, 10);
export const addYears = (day: string, years: number) =>
    `${Number(day.slice(0, 4)) + years}${day.slice(4)}`;
const daysBetween = (from: string, to: string) =>
    Math.round(
        (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / MS_PER_DAY
    );

/** The calendar day (YYYY-MM-DD) in the business time zone, not in UTC: at 22h in Brasília it is still today. */
export function businessDay(
    now: Date = new Date(),
    timeZone = 'America/Sao_Paulo'
): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(now);
}

export const isVoided = (t: ContractTerm) => !!(t.voidedAt ?? t.voided);

/** Contracts that count: the voided ones stay only in the history. */
export const liveContracts = <T extends ContractTerm>(terms: T[]): T[] =>
    terms.filter((t) => !isVoided(t));

const time = (d: string | Date) => new Date(d).getTime();
const newestFirst = <T extends ContractTerm>(terms: T[]) =>
    [...terms].sort((a, b) => time(b.createdAt) - time(a.createdAt));

/** The last day each contract covers, once later conversions cut their pilots short. */
export function effectiveEnds(terms: ContractTerm[]): Map<string, string> {
    const live = liveContracts(terms);
    const ends = new Map(live.map((t) => [t.id, t.endsOn]));
    for (const t of live) {
        if (t.origin !== 'conversion' || !t.previousId || !ends.has(t.previousId))
            continue;
        const cut = shiftDay(t.startsOn, -1);
        if (cut < ends.get(t.previousId)!) ends.set(t.previousId, cut);
    }
    return ends;
}

/** Stretches of days covered without a gap, oldest first. */
export function spans(terms: ContractTerm[]): { startsOn: string; endsOn: string }[] {
    const ends = effectiveEnds(terms);
    const sorted = liveContracts(terms)
        .map((t) => ({ startsOn: t.startsOn, endsOn: ends.get(t.id)! }))
        .filter((s) => s.startsOn <= s.endsOn)
        .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
    const merged: { startsOn: string; endsOn: string }[] = [];
    for (const s of sorted) {
        const last = merged.at(-1);
        if (last && s.startsOn <= shiftDay(last.endsOn, 1))
            last.endsOn = s.endsOn > last.endsOn ? s.endsOn : last.endsOn;
        else merged.push({ ...s });
    }
    return merged;
}

/** The stretch that matters today: the one running now, else the next one to start, else the last one that ended. */
export function coverage(
    terms: ContractTerm[],
    today: string
): { startsOn: string; endsOn: string } | null {
    const merged = spans(terms);
    return (
        merged.find((m) => m.startsOn <= today && today <= m.endsOn) ??
        merged.find((m) => m.startsOn > today) ??
        merged.at(-1) ??
        null
    );
}

/**
 * Active while a contract covers today; ended once one has started and none covers
 * today (even with a renewal starting later); pending while none has started yet.
 */
export function contractState(terms: ContractTerm[], today: string): ContractState {
    const merged = spans(terms);
    if (merged.some((m) => m.startsOn <= today && today <= m.endsOn)) return 'active';
    return merged.some((m) => m.startsOn <= today) ? 'ended' : 'pending';
}

export interface ContractStatus {
    state: ContractState;
    /** The contract covering today (or the latest one). */
    current: ContractView | null;
    /** Last covered day of the running stretch (renewals included), or of the last one that ended. */
    endsOn: string | null;
    daysLeft: number | null;
    /** First day of a contract that has not started yet, when today is not covered. */
    nextStartsOn: string | null;
    /** The latest contract registered was voided (kind and when). */
    voided: { kind: ContractKind | null; at: string } | null;
}

/** Contract summary of a restaurant: state, the stretch that matters and what comes next. */
export function contractSummary(
    terms: ContractTerm[],
    today: string
): Omit<ContractStatus, 'current' | 'voided'> {
    const merged = spans(terms);
    const state = contractState(terms, today);
    const running = merged.find((m) => m.startsOn <= today && today <= m.endsOn);
    const past = [...merged].reverse().find((m) => m.endsOn < today);
    const next = merged.find((m) => m.startsOn > today);
    const endsOn = running?.endsOn ?? past?.endsOn ?? null;
    return {
        state,
        endsOn,
        daysLeft: running ? daysBetween(today, running.endsOn) : null,
        nextStartsOn: running ? null : (next?.startsOn ?? null)
    };
}

/** What the Elo panel shows about a restaurant's contracts. */
export function contractStatus(contracts: ContractView[], today: string): ContractStatus {
    const live = liveContracts(contracts);
    const current =
        live
            .filter((c) => c.startsOn <= today && today <= c.effectiveEndsOn)
            .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0] ??
        latestContract(live);
    return {
        ...contractSummary(contracts, today),
        current,
        voided: voidedLatest(contracts)
    };
}

/** The latest contract registered, when it was voided: the screens say what changed and why the one before counts again. */
export function voidedLatest(
    terms: ContractTerm[]
): { kind: ContractKind | null; at: string } | null {
    const newest = newestFirst(terms)[0];
    if (!newest || !isVoided(newest)) return null;
    const at = newest.voided?.at ?? newest.voidedAt!;
    return { kind: newest.kind ?? null, at: new Date(at).toISOString() };
}

export type TrialState =
    'none' | 'scheduled' | 'running' | 'finished' | 'ended_early' | 'ended_by_conversion';

export interface TrialStatus {
    state: TrialState;
    days: number;
    startsOn: string | null;
    /** Last free day, after an early end or a conversion if one cut it. */
    endsOn: string | null;
    /** First day billed: the first due date of the restaurant. */
    billingStartsOn: string | null;
    daysLeft: number | null;
}

const NO_TRIAL: TrialStatus = {
    state: 'none',
    days: 0,
    startsOn: null,
    endsOn: null,
    billingStartsOn: null,
    daysLeft: null
};

/**
 * The free trial belongs to the first contract when it is a pilot. It runs from the
 * contract's start for `trialDays` days; ending it early or converting the pilot
 * stops it on that day, and billing starts there.
 */
export function trialStatus(terms: ContractTerm[], today: string): TrialStatus {
    const first = liveContracts(terms).find((t) => t.origin === 'initial');
    if (!first) return NO_TRIAL;
    const days = first.kind === 'pilot' ? (first.trialDays ?? 0) : 0;
    const natural = shiftDay(first.startsOn, days);
    const cut =
        first.trialEndedOn && first.trialEndedOn < natural ? first.trialEndedOn : null;
    const billingStartsOn = cut ?? natural;
    if (!days) return { ...NO_TRIAL, startsOn: first.startsOn, billingStartsOn };
    const endsOn = shiftDay(billingStartsOn, -1);
    const base = {
        days,
        startsOn: first.startsOn,
        endsOn,
        billingStartsOn,
        daysLeft: null
    };
    if (today < first.startsOn) return { ...base, state: 'scheduled' };
    if (today < billingStartsOn)
        return { ...base, state: 'running', daysLeft: daysBetween(today, endsOn) };
    if (cut)
        return {
            ...base,
            state:
                first.trialEndReason === 'conversion'
                    ? 'ended_by_conversion'
                    : 'ended_early'
        };
    return { ...base, state: 'finished' };
}

export type ContractProblem =
    | 'signed_in_future'
    | 'signed_after_end'
    | 'ends_before_start'
    | 'too_long'
    | 'already_has_contract'
    | 'nothing_to_renew'
    | 'overlaps'
    | 'nothing_to_convert'
    | 'conversion_is_definitive'
    | 'trial_only_initial_pilot'
    | 'plan_required';

/**
 * What is wrong with a contract about to be registered, empty when it can be saved.
 * The first one needs no history; a renewal starts after the latest contract ends;
 * a conversion turns the latest pilot into a definitive contract. Only a first
 * pilot contract may carry a free trial.
 */
export function contractProblems(
    input: {
        kind: ContractKind;
        origin: ContractOrigin;
        signedOn: string;
        startsOn: string;
        endsOn: string;
        trialDays?: number;
    },
    existing: (ContractTerm & { kind: ContractKind })[],
    today: string
): ContractProblem[] {
    const problems: ContractProblem[] = [];
    if (input.signedOn > today) problems.push('signed_in_future');
    if (input.endsOn < input.startsOn) problems.push('ends_before_start');
    else if (input.signedOn > input.endsOn) problems.push('signed_after_end');
    else if (input.endsOn > addYears(input.startsOn, CONTRACT_LIMITS.maxYears))
        problems.push('too_long');
    if (
        (input.trialDays ?? 0) > 0 &&
        (input.kind !== 'pilot' || input.origin !== 'initial')
    )
        problems.push('trial_only_initial_pilot');
    const live = liveContracts(existing);
    const latest = latestContract(live);
    const ends = effectiveEnds(live);
    if (input.origin === 'initial' && latest) problems.push('already_has_contract');
    if (input.origin === 'renewal') {
        if (!latest) problems.push('nothing_to_renew');
        else if (input.startsOn <= ends.get(latest.id)!) problems.push('overlaps');
    }
    if (input.origin === 'conversion') {
        if (input.kind !== 'definitive') problems.push('conversion_is_definitive');
        if (
            !latest ||
            latest.kind !== 'pilot' ||
            input.startsOn < latest.startsOn ||
            shiftDay(input.startsOn, -1) > ends.get(latest.id)!
        )
            problems.push('nothing_to_convert');
    }
    return problems;
}

/**
 * The latest contract that still counts: the one no other live contract follows
 * (each new one points at the previous), so two made in the same instant still
 * have an order. It is the base for a renewal or conversion and the only one that can be voided.
 */
export function latestContract<T extends ContractTerm>(terms: T[]): T | null {
    const live = liveContracts(terms);
    const followed = new Set(live.map((t) => t.previousId));
    return (
        newestFirst(live.filter((t) => !followed.has(t.id)))[0] ??
        newestFirst(live)[0] ??
        null
    );
}

/**
 * The due date once the days without a contract are left out: billing stops during a
 * gap between contracts. `due` is the latest entry's due date and `base` the due date
 * it started from (the period start, or the due date itself for an adjustment). Each gap
 * that begins at or after `base` and that the due date reaches pushes it by the gap's
 * length, so credit paid past an end carries over and a debt of covered days stays.
 */
export function billedDueDate(
    entry: { due: string; base: string },
    terms: ContractTerm[]
): string {
    const merged = spans(terms);
    let due = entry.due;
    for (const [i, span] of merged.entries()) {
        const next = merged[i + 1];
        if (!next) break;
        const gapStart = shiftDay(span.endsOn, 1);
        if (gapStart < entry.base || gapStart > due) continue;
        due = shiftDay(due, daysBetween(gapStart, next.startsOn));
    }
    return due;
}

/** A payment or adjustment of the billing history, in the order it was recorded (voided ones left out). */
export interface PeriodEntry {
    id: string;
    kind: 'payment' | 'adjustment';
    periodStart: string | null;
    newDueDate: string;
}

const monthsBetween = (from: string, to: string) =>
    (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 +
    Number(to.slice(5, 7)) -
    Number(from.slice(5, 7));

const plusMonths = (day: string, months: number) =>
    toDay(addMonths(dateOnly(day)!, months));

/**
 * New periods for the payments that followed the first billed day when it moves (the
 * free trial ended early, or came back): each keeps its length in months and starts
 * where the one before ends. The chain stops at the first entry that does not continue
 * the previous one, such as a manual adjustment or a restart after a suspension, and
 * everything from there on keeps its dates.
 */
export function rebasedPayments(
    entries: PeriodEntry[],
    from: string,
    to: string,
    terms: ContractTerm[]
): Map<string, { periodStart: string; newDueDate: string }> {
    const out = new Map<string, { periodStart: string; newDueDate: string }>();
    if (from === to) return out;
    let oldDue = from;
    let oldRaw = from;
    let newDue = to;
    for (const e of entries) {
        if (e.kind !== 'payment' || !e.periodStart) break;
        if (e.periodStart !== oldDue && e.periodStart !== oldRaw) break;
        const months = monthsBetween(e.periodStart, e.newDueDate);
        const end = plusMonths(newDue, months);
        out.set(e.id, { periodStart: newDue, newDueDate: end });
        oldRaw = e.newDueDate;
        oldDue = billedDueDate({ due: e.newDueDate, base: e.periodStart }, terms);
        newDue = billedDueDate({ due: end, base: newDue }, terms);
    }
    return out;
}

export type BillingProblem = 'contract_pending' | 'nothing_owed';

/**
 * Whether a payment can be recorded: never before the first contract; after the last
 * one ended, only to settle days it covered or ahead of a renewal already scheduled.
 */
export function billingProblem(
    contract: {
        state: ContractState;
        endsOn: string | null;
        nextStartsOn: string | null;
    },
    due: string
): BillingProblem | null {
    if (contract.state === 'pending') return 'contract_pending';
    if (
        contract.state === 'ended' &&
        !contract.nextStartsOn &&
        contract.endsOn &&
        due > contract.endsOn
    )
        return 'nothing_owed';
    return null;
}

const termPlan = (t: ContractTerm): BillingPlan | null =>
    t.plan ??
    (t.priceCents != null && t.cycleMonths != null
        ? {
              id: t.planId ?? null,
              name: t.planName ?? '',
              priceCents: t.priceCents,
              cycleMonths: t.cycleMonths
          }
        : null);

/**
 * What the restaurant pays now: the plan of the contract in force (or of the last one,
 * for a debt after it ended), unless a later amendment changed it. Nothing before
 * the first contract starts.
 */
export function planInForce(
    terms: ContractTerm[],
    today: string,
    amendment: (BillingPlan & { at: string | Date }) | null
): BillingPlan | null {
    const live = liveContracts(terms);
    const ends = effectiveEnds(live);
    const started = live.filter((t) => t.startsOn <= today);
    if (!started.length) return null;
    const current =
        started
            .filter((t) => today <= ends.get(t.id)!)
            .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0] ??
        latestContract(started)!;
    if (amendment && time(amendment.at) > time(current.createdAt))
        return {
            id: amendment.id,
            name: amendment.name,
            priceCents: amendment.priceCents,
            cycleMonths: amendment.cycleMonths
        };
    return (
        termPlan(current) ??
        (amendment
            ? {
                  id: amendment.id,
                  name: amendment.name,
                  priceCents: amendment.priceCents,
                  cycleMonths: amendment.cycleMonths
              }
            : null)
    );
}
