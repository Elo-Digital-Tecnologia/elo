/** A shift, "HH:MM". If `close` is less than or equal to `open`, it closes after midnight. */
export interface Shift {
    open: string;
    close: string;
}

/** Seven positions, Sunday (0) to Saturday (6), each with the day's shifts in order of opening. An empty list = closed. */
export type OpeningHours = Shift[][];

export const HOURS_LIMITS = {
    /** A safety net for the payload; no real restaurant gets near it. */
    maxShiftsPerDay: 10
} as const;

export interface OpenStatus {
    open: boolean;
    /** Texto pronto: "Aberto · fecha às 23:00", "Abre amanhã às 11:00". */
    label: string;
}

export const WEEKDAYS = [
    'domingo',
    'segunda',
    'terça',
    'quarta',
    'quinta',
    'sexta',
    'sábado'
];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isHHMM = (v: unknown): v is string => typeof v === 'string' && HHMM.test(v);
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const crossesMidnight = (s: Shift) => minutes(s.close) <= minutes(s.open);

/** Dia da semana (0 = domingo) e minuto do dia no fuso informado. */
function localClock(now: Date, timeZone: string): { dow: number; minute: number } {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { dow, minute: Number(get('hour')) * 60 + Number(get('minute')) };
}

const isShift = (s: unknown): s is Shift =>
    typeof s === 'object' &&
    s !== null &&
    isHHMM((s as Shift).open) &&
    isHHMM((s as Shift).close);
const isWeek = (hours: unknown): hours is unknown[][] =>
    Array.isArray(hours) && hours.length === 7 && hours.every(Array.isArray);

export type HoursProblemCode =
    | 'not_a_week'
    | 'too_many_shifts'
    | 'invalid_time'
    | 'unordered'
    | 'overlap'
    | 'overnight_not_last'
    | 'overlaps_next_day';

/** `day` is null when the whole value is malformed; `shift` is the index of the shift at fault. */
export interface HoursProblem {
    day: number | null;
    shift: number | null;
    code: HoursProblemCode;
}

/**
 * Everything wrong with a week of hours, empty when it can be saved. Shifts of a day
 * come in order of opening, with a real gap between them; only the last one may close
 * after midnight, and that closing cannot reach the first shift of the next day.
 */
export function hoursProblems(hours: unknown): HoursProblem[] {
    if (!isWeek(hours)) return [{ day: null, shift: null, code: 'not_a_week' }];
    const problems: HoursProblem[] = [];
    const week = hours;
    week.forEach((shifts, day) => {
        if (shifts.length > HOURS_LIMITS.maxShiftsPerDay)
            return void problems.push({ day, shift: null, code: 'too_many_shifts' });
        const invalid = shifts.findIndex((s) => !isShift(s));
        if (invalid >= 0)
            return void problems.push({ day, shift: invalid, code: 'invalid_time' });
        (shifts as Shift[]).forEach((s, i, all) => {
            const prev = all[i - 1];
            if (!prev) return;
            if (crossesMidnight(prev))
                problems.push({ day, shift: i - 1, code: 'overnight_not_last' });
            else if (minutes(s.open) <= minutes(prev.open))
                problems.push({ day, shift: i, code: 'unordered' });
            else if (minutes(s.open) <= minutes(prev.close))
                problems.push({ day, shift: i, code: 'overlap' });
        });
        const last = shifts[shifts.length - 1] as Shift | undefined;
        const nextFirst = (week[(day + 1) % 7] as Shift[])[0];
        if (
            last &&
            crossesMidnight(last) &&
            minutes(last.close) > 0 &&
            nextFirst &&
            isHHMM(nextFirst.open) &&
            minutes(nextFirst.open) <= minutes(last.close)
        ) {
            problems.push({ day, shift: shifts.length - 1, code: 'overlaps_next_day' });
        }
    });
    return problems;
}

/**
 * For the last shift of a day, if it closes after midnight, when it really ends: "até 01:00 de segunda".
 * The early hours of a day belong to the shift of the day before.
 */
export function overnightLabel(
    day: number,
    shifts: Shift[] | null | undefined
): string | null {
    const last = shifts?.[shifts.length - 1];
    if (!last || !isHHMM(last.open) || !isHHMM(last.close) || !crossesMidnight(last))
        return null;
    return `até ${last.close} de ${WEEKDAYS[(day + 1) % 7]}`;
}

/** A stretch of a day (minutes from midnight) when the restaurant is open; `spill` when it is the early hours of the day before's shift. */
export interface ShiftPiece {
    from: number;
    to: number;
    spill: boolean;
    /** Day (0 = Sunday) whose shift this is. */
    day: number;
    /** Position of the shift in its day. */
    index: number;
}

/**
 * What each day of the week looks like on a 24 h strip: a shift that closes after
 * midnight shows on its own day until 24:00 and, as `spill`, in the early hours of the next.
 */
export function weekShifts(hours: OpeningHours): ShiftPiece[][] {
    const week: ShiftPiece[][] = Array.from({ length: 7 }, () => []);
    hours.forEach((shifts, day) => {
        shifts.forEach((h, index) => {
            if (!isHHMM(h.open) || !isHHMM(h.close)) return;
            const open = minutes(h.open);
            const close = minutes(h.close);
            if (close > open)
                return void week[day].push({
                    from: open,
                    to: close,
                    spill: false,
                    day,
                    index
                });
            week[day].push({ from: open, to: 1440, spill: false, day, index });
            if (close > 0)
                week[(day + 1) % 7].unshift({
                    from: 0,
                    to: close,
                    spill: true,
                    day,
                    index
                });
        });
    });
    return week;
}

interface HoursState extends OpenStatus {
    /** Minutes until the status flips (approximate across DST changes). */
    flipsIn: number | null;
}

function hoursState(hours: OpeningHours, now: Date, timeZone: string): HoursState {
    const { dow, minute } = localClock(now, timeZone);
    const yesterdayLast = hours[(dow + 6) % 7].at(-1);

    // Turno de ontem que atravessa a meia-noite ainda vale agora.
    if (
        yesterdayLast &&
        crossesMidnight(yesterdayLast) &&
        minute < minutes(yesterdayLast.close)
    ) {
        return {
            open: true,
            label: `Aberto · fecha às ${yesterdayLast.close}`,
            flipsIn: minutes(yesterdayLast.close) - minute
        };
    }
    for (const shift of hours[dow]) {
        const o = minutes(shift.open);
        const c = minutes(shift.close);
        const overnight = c <= o;
        if (minute >= o && (overnight || minute < c)) {
            return {
                open: true,
                label: `Aberto · fecha às ${shift.close}`,
                flipsIn: overnight ? 1440 - minute + c : c - minute
            };
        }
        if (minute < o)
            return {
                open: false,
                label: `Fechado · abre hoje às ${shift.open}`,
                flipsIn: o - minute
            };
    }
    for (let k = 1; k <= 7; k++) {
        const next = hours[(dow + k) % 7][0];
        if (!next) continue;
        const when = k === 1 ? 'amanhã' : WEEKDAYS[(dow + k) % 7];
        return {
            open: false,
            label: `Fechado · abre ${when} às ${next.open}`,
            flipsIn: 1440 - minute + (k - 1) * 1440 + minutes(next.open)
        };
    }
    return { open: false, label: 'Fechado', flipsIn: null };
}

/**
 * Situação do restaurante agora, no fuso dele. Devolve `null` quando não há horário
 * cadastrado (o cardápio então não mostra nada).
 */
export function openStatus(
    hours: OpeningHours | null | undefined,
    now: Date,
    timeZone: string
): OpenStatus | null {
    if (!isWeek(hours)) return null;
    const { open, label } = hoursState(hours as OpeningHours, now, timeZone);
    return { open, label };
}

/**
 * A window that overrides the opening hours: a temporary closure, or an extra opening
 * outside the hours (a late night, a private event). `endsAt` null (closures only)
 * lasts until someone ends it; `endedAt` is an early end.
 */
export type PauseKind = 'closure' | 'opening';

export interface PauseWindow {
    /** Missing on closures saved before extra openings existed. */
    kind?: PauseKind;
    startsAt: string | Date;
    endsAt: string | Date | null;
    endedAt?: string | Date | null;
    reason?: string | null;
}

const kindOf = (p: PauseWindow): PauseKind => p.kind ?? 'closure';

export interface Availability {
    open: boolean;
    /** Why it is closed: outside opening hours or a temporary closure. */
    reason: 'hours' | 'pause' | null;
    /** Open only thanks to an extra opening outside the hours (its reason stays in the records, guests never see it). */
    extra: boolean;
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

/** "hoje às 23:00" or "em 02/11 às 01:00", in the restaurant's time zone. */
function whenLabel(end: number, now: Date, timeZone: string): string {
    const fmt = (d: Date, o: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat('pt-BR', { timeZone, ...o }).format(d);
    const at = new Date(end);
    const hour = fmt(at, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const sameDay =
        fmt(at, { day: '2-digit', month: '2-digit' }) ===
        fmt(now, { day: '2-digit', month: '2-digit' });
    return sameDay
        ? `hoje às ${hour}`
        : `em ${fmt(at, { day: '2-digit', month: '2-digit' })} às ${hour}`;
}

/**
 * Whether guests can open a table right now: a temporary closure wins over
 * everything, then an extra opening, then the opening hours; a restaurant without
 * hours is always open.
 */
export function availability(input: {
    hours: OpeningHours | null | undefined;
    pauses: PauseWindow[];
    now: Date;
    timeZone: string;
}): Availability {
    const { hours, pauses, now, timeZone } = input;
    const closure = pauses.find((p) => kindOf(p) === 'closure' && isPauseActive(p, now));
    if (closure) {
        const end = pauseEnd(closure);
        return {
            open: false,
            reason: 'pause',
            extra: false,
            label:
                end === null
                    ? 'Fechado temporariamente'
                    : `Fechado temporariamente · volta ${whenLabel(end, now, timeZone)}`,
            pauseReason: closure.reason?.trim() || null,
            changesAt: end === null ? null : new Date(end).toISOString()
        };
    }
    const state = isWeek(hours) ? hoursState(hours as OpeningHours, now, timeZone) : null;
    const opening = pauses.find((p) => kindOf(p) === 'opening' && isPauseActive(p, now));
    const flip =
        state?.flipsIn != null
            ? now.getTime() +
              state.flipsIn * 60_000 -
              now.getSeconds() * 1000 -
              now.getMilliseconds()
            : undefined;
    const starts = pauses.map((p) => time(p.startsAt)!).filter((t) => t > now.getTime());
    const next = (extra: (number | null | undefined)[]) => {
        const t = [...extra, ...starts]
            .filter((v): v is number => typeof v === 'number')
            .sort((a, b) => a - b)[0];
        return t === undefined ? null : new Date(t).toISOString();
    };
    if (opening && state && !state.open) {
        const end = pauseEnd(opening)!;
        return {
            open: true,
            reason: null,
            extra: true,
            label: `Aberto fora do horário · até ${whenLabel(end, now, timeZone)
                .replace(/^hoje às /, '')
                .replace(/^em /, '')}`,
            pauseReason: null,
            changesAt: next([end])
        };
    }
    // An extra opening that runs past the closing time takes over when the hours close.
    const openingEnd = opening ? pauseEnd(opening) : null;
    return {
        open: state?.open ?? true,
        reason: state && !state.open ? 'hours' : null,
        extra: false,
        label: state?.label ?? null,
        pauseReason: null,
        changesAt: next([flip, openingEnd])
    };
}

export const PAUSE_LIMITS = {
    reasonMax: 120,
    aheadDays: 365,
    /** An extra opening covers one night or event, never a standing change of the hours. */
    openingMaxHours: 24
} as const;

export type PauseProblem =
    | 'ends_before_start'
    | 'starts_in_past'
    | 'too_far_ahead'
    | 'overlaps'
    | 'opening_needs_end'
    | 'opening_too_long';

/** What is wrong with a closure or an extra opening about to be scheduled; empty when it can be saved. */
export function pauseProblems(
    p: { kind?: PauseKind; startsAt: Date; endsAt: Date | null },
    others: PauseWindow[],
    now: Date
): PauseProblem[] {
    const problems: PauseProblem[] = [];
    const kind = p.kind ?? 'closure';
    const start = p.startsAt.getTime();
    const end = p.endsAt?.getTime() ?? null;
    if (start < now.getTime() - 60_000) problems.push('starts_in_past');
    if (start > now.getTime() + PAUSE_LIMITS.aheadDays * 86_400_000)
        problems.push('too_far_ahead');
    if (end !== null && end <= start) problems.push('ends_before_start');
    if (kind === 'opening' && end === null) problems.push('opening_needs_end');
    if (
        kind === 'opening' &&
        end !== null &&
        end - start > PAUSE_LIMITS.openingMaxHours * 3_600_000
    )
        problems.push('opening_too_long');
    const overlaps = others
        .filter((o) => kindOf(o) === kind)
        .some((o) => {
            const oStart = time(o.startsAt)!;
            const oEnd = pauseEnd(o);
            if (oEnd !== null && oEnd <= now.getTime()) return false;
            return (end === null || oStart < end) && (oEnd === null || start < oEnd);
        });
    if (overlaps) problems.push('overlaps');
    return problems;
}
