import { accessState, AccessState } from './subscription';

export const BILLING_LIMITS = {
  cyclesMax: 12,
  cycleMonthsMax: 12,
  /** Highest amount accepted, as a multiple of what the plan expects. */
  amountFactorMax: 10,
  planPriceMaxCents: 1_000_000,
  planNameMax: 60,
  noteMax: 300,
  reasonMin: 3,
  reasonMax: 300,
} as const;

export interface PlanView {
  id: string;
  name: string;
  priceCents: number;
  cycleMonths: number;
  active: boolean;
  /** Restaurants currently on this plan. */
  restaurants: number;
}

export type BillingEntryKind = 'payment' | 'adjustment';

export interface BillingEntryView {
  id: string;
  kind: BillingEntryKind;
  amountCents: number;
  expectedCents: number | null;
  paidAt: string;
  periodStart: string | null;
  newDueDate: string;
  cycles: number | null;
  planName: string | null;
  note: string | null;
  recordedByName: string | null;
  voidedAt: string | null;
  voidedByName: string | null;
  voidReason: string | null;
  createdAt: string;
}

export interface PaymentPreview {
  periodStart: string;
  newDueDate: string;
  expectedCents: number;
  /** The period starts on the payment date because the restaurant was suspended for being overdue. */
  restartsFromPayment: boolean;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` of a date, read in UTC. */
export const toDay = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * A calendar day as stored by billing: noon UTC, so it reads as the same day in any
 * Brazilian time zone. Returns null for anything that is not a real `YYYY-MM-DD` day.
 */
export function dateOnly(day: string): Date | null {
  if (!DAY_PATTERN.test(day)) return null;
  const d = new Date(`${day}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || toDay(d) !== day ? null : d;
}

/** Adds whole months; a day missing in the target month falls back to its last day (31/01 + 1 → 28 or 29/02). */
export function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  const day = out.getUTCDate();
  out.setUTCDate(1);
  out.setUTCMonth(out.getUTCMonth() + months);
  const last = new Date(Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0)).getUTCDate();
  out.setUTCDate(Math.min(day, last));
  return out;
}

/** How a plan's cycle reads in the screens. */
export const cycleLabel = (months: number) => (months === 1 ? 'mensal' : months === 12 ? 'anual' : `a cada ${months} meses`);

export const expectedAmount = (priceCents: number, cycles: number) => priceCents * cycles;

/**
 * Period a payment covers. While the restaurant is active or in grace, it continues from
 * the current due date, keeping the billing day. Once suspended for being overdue, it
 * starts on the payment date, so the suspended time is not charged.
 */
export function paymentPeriod(input: { dueDate: Date; paidAt: Date; cycles: number; cycleMonths: number; now?: Date }) {
  const overdue = accessState(input.dueDate, input.now ?? new Date()) === AccessState.Suspended;
  const start = overdue ? dateOnly(toDay(input.paidAt))! : input.dueDate;
  return { start, end: addMonths(start, input.cycles * input.cycleMonths), restartsFromPayment: overdue };
}

export type PaymentProblem = 'paid_in_future' | 'paid_before_creation' | 'cycles_out_of_range' | 'amount_out_of_range' | 'note_required' | 'note_too_long';

/** Everything wrong with a payment, empty when it can be recorded. */
export function paymentProblems(p: {
  paidAt: Date;
  restaurantCreatedAt: Date;
  cycles: number;
  amountCents: number;
  expectedCents: number;
  note?: string | null;
  now?: Date;
}): PaymentProblem[] {
  const problems: PaymentProblem[] = [];
  const now = p.now ?? new Date();
  if (toDay(p.paidAt) > toDay(now)) problems.push('paid_in_future');
  // One day of slack: a restaurant created late in the evening is already "tomorrow" in UTC.
  if (toDay(p.paidAt) < toDay(new Date(p.restaurantCreatedAt.getTime() - 86_400_000))) problems.push('paid_before_creation');
  if (!Number.isInteger(p.cycles) || p.cycles < 1 || p.cycles > BILLING_LIMITS.cyclesMax) problems.push('cycles_out_of_range');
  const max = Math.max(p.expectedCents, 1) * BILLING_LIMITS.amountFactorMax;
  if (!Number.isInteger(p.amountCents) || p.amountCents < 1 || p.amountCents > max) problems.push('amount_out_of_range');
  const note = p.note?.trim() ?? '';
  if (p.amountCents !== p.expectedCents && !note) problems.push('note_required');
  if (note.length > BILLING_LIMITS.noteMax) problems.push('note_too_long');
  return problems;
}

export type DueDateProblem = 'due_in_past' | 'reason_required';

/** A manual due date fixes mistakes or grants extra days: never in the past, always with a reason. */
export function dueDateProblems(p: { dueDate: Date; reason: string; now?: Date }): DueDateProblem[] {
  const problems: DueDateProblem[] = [];
  if (toDay(p.dueDate) < toDay(p.now ?? new Date())) problems.push('due_in_past');
  const reason = p.reason.trim();
  if (reason.length < BILLING_LIMITS.reasonMin || reason.length > BILLING_LIMITS.reasonMax) problems.push('reason_required');
  return problems;
}

export type SuspensionReason = 'manual' | 'overdue';

/** Why a restaurant's team is locked out (both can hold), so the screen can say what fixes each. */
export function suspensionReasons(dueDate: Date, manuallySuspended: boolean, now: Date = new Date()): SuspensionReason[] {
  const reasons: SuspensionReason[] = [];
  if (manuallySuspended) reasons.push('manual');
  if (accessState(dueDate, now) === AccessState.Suspended) reasons.push('overdue');
  return reasons;
}
