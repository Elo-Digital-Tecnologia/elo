/** Horário de um dia, "HH:MM". Se `close` for menor ou igual a `open`, fecha depois da meia-noite. */
export interface DayHours {
  open: string;
  close: string;
}

/** Sete posições, de domingo (0) a sábado (6). `null` = fechado naquele dia. */
export type OpeningHours = (DayHours | null)[];

export interface OpenStatus {
  open: boolean;
  /** Texto pronto: "Aberto · fecha às 23:00", "Abre amanhã às 11:00". */
  label: string;
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isHHMM = (v: unknown): v is string => typeof v === 'string' && HHMM.test(v);
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

/** Dia da semana (0 = domingo) e minuto do dia no fuso informado. */
function localClock(now: Date, timeZone: string): { dow: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { dow, minute: Number(get('hour')) * 60 + Number(get('minute')) };
}

interface HoursState extends OpenStatus {
  /** Minutes until the status flips (approximate across DST changes). */
  flipsIn: number | null;
}

function hoursState(hours: OpeningHours, now: Date, timeZone: string): HoursState {
  const { dow, minute } = localClock(now, timeZone);
  const today = hours[dow];
  const yesterday = hours[(dow + 6) % 7];

  // Turno de ontem que atravessa a meia-noite ainda vale agora.
  if (yesterday && minutes(yesterday.close) <= minutes(yesterday.open) && minute < minutes(yesterday.close)) {
    return { open: true, label: `Aberto · fecha às ${yesterday.close}`, flipsIn: minutes(yesterday.close) - minute };
  }
  if (today) {
    const o = minutes(today.open);
    const c = minutes(today.close);
    const overnight = c <= o;
    if (minute >= o && (overnight || minute < c)) {
      return { open: true, label: `Aberto · fecha às ${today.close}`, flipsIn: overnight ? 1440 - minute + c : c - minute };
    }
    if (minute < o) return { open: false, label: `Fechado · abre hoje às ${today.open}`, flipsIn: o - minute };
  }
  for (let k = 1; k <= 7; k++) {
    const next = hours[(dow + k) % 7];
    if (!next) continue;
    const when = k === 1 ? 'amanhã' : WEEKDAYS[(dow + k) % 7];
    return { open: false, label: `Fechado · abre ${when} às ${next.open}`, flipsIn: 1440 - minute + (k - 1) * 1440 + minutes(next.open) };
  }
  return { open: false, label: 'Fechado', flipsIn: null };
}

/**
 * Situação do restaurante agora, no fuso dele. Devolve `null` quando não há horário
 * cadastrado (o cardápio então não mostra nada).
 */
export function openStatus(hours: OpeningHours | null | undefined, now: Date, timeZone: string): OpenStatus | null {
  if (!Array.isArray(hours) || hours.length !== 7) return null;
  const { open, label } = hoursState(hours, now, timeZone);
  return { open, label };
}

/** A temporary closure. `endsAt` null lasts until someone ends it; `endedAt` is an early end. */
export interface PauseWindow {
  startsAt: string | Date;
  endsAt: string | Date | null;
  endedAt?: string | Date | null;
  reason?: string | null;
}

export interface Availability {
  open: boolean;
  /** Why it is closed: outside opening hours or a temporary closure. */
  reason: 'hours' | 'pause' | null;
  /** Ready-made text for guests and staff; null when there are no hours and no closure (always open). */
  label: string | null;
  pauseReason: string | null;
  /** Next moment the status changes, so screens can refresh on their own. */
  changesAt: string | null;
}

const time = (v: string | Date | null | undefined) => (v ? new Date(v).getTime() : null);

/** When a closure really stops: the planned end or an earlier manual end, whichever comes first. */
export function pauseEnd(p: PauseWindow): number | null {
  const ends = [time(p.endsAt), time(p.endedAt)].filter((t): t is number => t !== null);
  return ends.length ? Math.min(...ends) : null;
}

export const isPauseActive = (p: PauseWindow, now: Date) => {
  const end = pauseEnd(p);
  return time(p.startsAt)! <= now.getTime() && (end === null || end > now.getTime());
};

function returnLabel(end: number, now: Date, timeZone: string): string {
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { timeZone, ...o }).format(d);
  const at = new Date(end);
  const hour = fmt(at, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const sameDay = fmt(at, { day: '2-digit', month: '2-digit' }) === fmt(now, { day: '2-digit', month: '2-digit' });
  return sameDay ? `volta hoje às ${hour}` : `volta em ${fmt(at, { day: '2-digit', month: '2-digit' })} às ${hour}`;
}

/**
 * Whether guests can open a table right now: a temporary closure wins over the
 * opening hours, and a restaurant without hours is always open.
 */
export function availability(input: { hours: OpeningHours | null | undefined; pauses: PauseWindow[]; now: Date; timeZone: string }): Availability {
  const { hours, pauses, now, timeZone } = input;
  const active = pauses.find((p) => isPauseActive(p, now));
  if (active) {
    const end = pauseEnd(active);
    return {
      open: false,
      reason: 'pause',
      label: end === null ? 'Fechado temporariamente' : `Fechado temporariamente · ${returnLabel(end, now, timeZone)}`,
      pauseReason: active.reason?.trim() || null,
      changesAt: end === null ? null : new Date(end).toISOString(),
    };
  }
  const nextPause = pauses
    .map((p) => time(p.startsAt)!)
    .filter((t) => t > now.getTime())
    .sort((a, b) => a - b)[0];
  const state = Array.isArray(hours) && hours.length === 7 ? hoursState(hours, now, timeZone) : null;
  const flip = state?.flipsIn != null ? now.getTime() + state.flipsIn * 60_000 - now.getSeconds() * 1000 - now.getMilliseconds() : undefined;
  const next = [flip, nextPause].filter((t): t is number => t !== undefined).sort((a, b) => a - b)[0];
  return {
    open: state?.open ?? true,
    reason: state && !state.open ? 'hours' : null,
    label: state?.label ?? null,
    pauseReason: null,
    changesAt: next === undefined ? null : new Date(next).toISOString(),
  };
}

export const PAUSE_LIMITS = { reasonMax: 120, aheadDays: 365 } as const;

export type PauseProblem = 'ends_before_start' | 'starts_in_past' | 'too_far_ahead' | 'overlaps';

/** What is wrong with a closure about to be scheduled; empty when it can be saved. */
export function pauseProblems(p: { startsAt: Date; endsAt: Date | null }, others: PauseWindow[], now: Date): PauseProblem[] {
  const problems: PauseProblem[] = [];
  const start = p.startsAt.getTime();
  const end = p.endsAt?.getTime() ?? null;
  if (start < now.getTime() - 60_000) problems.push('starts_in_past');
  if (start > now.getTime() + PAUSE_LIMITS.aheadDays * 86_400_000) problems.push('too_far_ahead');
  if (end !== null && end <= start) problems.push('ends_before_start');
  const overlaps = others.some((o) => {
    const oStart = time(o.startsAt)!;
    const oEnd = pauseEnd(o);
    if (oEnd !== null && oEnd <= now.getTime()) return false;
    return (end === null || oStart < end) && (oEnd === null || start < oEnd);
  });
  if (overlaps) problems.push('overlaps');
  return problems;
}
