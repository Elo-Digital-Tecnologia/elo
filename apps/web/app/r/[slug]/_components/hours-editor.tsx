'use client';

import type { OpeningHours } from '@elo/core/opening-hours/open-status';
import { HOURS_LIMITS, hoursProblems, isHHMM } from '@elo/core/opening-hours/open-status';
import { Button } from '@elo/ui/components/forms/button';
import { TimeInput } from '@elo/ui/components/forms/date-fields';
import { Select, Switch } from '@elo/ui/components/forms/fields';
import { Modal } from '@elo/ui/components/overlays/modal';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { NEXT_SHIFT } from '#/_lib/constants/opening-hours';
import { DAYS, HOURS_PROBLEMS } from '#/_lib/messages/opening-hours';
import { WeekPreview } from './week-preview';

export interface ShiftDraft {
    from: string;
    to: string;
    /** Closes after midnight, on the next day. */
    nextDay: boolean;
}

export interface DayDraft {
    open: boolean;
    shifts: ShiftDraft[];
}

const DEFAULT_SHIFT: ShiftDraft = { from: '11:00', to: '23:00', nextDay: false };
const crosses = (s: ShiftDraft) => s.to <= s.from;
const clock = (min: number) =>
    `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

export const toDrafts = (hours: OpeningHours | null): DayDraft[] =>
    DAYS.map((_, i) => {
        const shifts = hours?.[i] ?? [];
        return shifts.length
            ? {
                  open: true,
                  shifts: shifts.map((s) => ({
                      from: s.open,
                      to: s.close,
                      nextDay: s.close <= s.open
                  }))
              }
            : { open: false, shifts: [{ ...DEFAULT_SHIFT }] };
    });

/** The week to save or draw: open days only, shifts with readable times, in order of opening. */
export const toOpeningHours = (days: DayDraft[]): OpeningHours =>
    days.map((d) =>
        d.open
            ? d.shifts
                  .filter((s) => isHHMM(s.from) && isHHMM(s.to))
                  .sort((a, b) => a.from.localeCompare(b.from))
                  .map((s) => ({ open: s.from, close: s.to }))
            : []
    );

/** What is wrong with each day, in a sentence; null when the day makes sense. */
export function hoursErrors(days: DayDraft[]): (string | null)[] {
    const out = days.map((d, i): string | null => {
        if (!d.open) return null;
        for (const [k, s] of d.shifts.entries()) {
            const which = d.shifts.length > 1 ? `Turno ${k + 1}: ` : '';
            if (!isHHMM(s.from) || !isHHMM(s.to)) return HOURS_PROBLEMS.invalid_time(i);
            if (k < d.shifts.length - 1 && crosses(s))
                return `${which}${HOURS_PROBLEMS.overnight_not_last(i)}`;
            if (!s.nextDay && crosses(s))
                return `${which}fechando às ${s.to}, o turno termina depois da meia-noite: escolha "no dia seguinte".`;
            if (s.nextDay && !crosses(s))
                return `${which}fechando às ${s.to}, o turno termina no mesmo dia: escolha "no mesmo dia".`;
        }
        return null;
    });
    const week = toOpeningHours(days.map((d, i) => (out[i] ? { ...d, open: false } : d)));
    for (const p of hoursProblems(week))
        if (p.day !== null && !out[p.day]) out[p.day] = HOURS_PROBLEMS[p.code](p.day);
    return out;
}

/** The next shift of a day starts a few hours after the last one ends. */
function nextShift(last: ShiftDraft): ShiftDraft {
    const lastEnd = isHHMM(last.to) ? toMinutes(last.to) : NEXT_SHIFT.fallbackLastEnd;
    const start = Math.min(lastEnd + NEXT_SHIFT.gapAfterLast, NEXT_SHIFT.latestStart);
    return {
        from: clock(start),
        to: clock(Math.min(start + NEXT_SHIFT.length, NEXT_SHIFT.latestEnd)),
        nextDay: false
    };
}

/**
 * The week of opening hours: any number of shifts per day (lunch and dinner, a break
 * in the afternoon), with the same shifts copied to other days in one step.
 */
export function HoursEditor({
    days,
    onChange,
    today
}: {
    days: DayDraft[];
    onChange: (days: DayDraft[]) => void;
    today?: number;
}) {
    const [copyFrom, setCopyFrom] = useState<number | null>(null);
    const [targets, setTargets] = useState<number[]>([]);
    const errors = hoursErrors(days);

    const setDay = (i: number, patch: Partial<DayDraft>) =>
        onChange(days.map((d, k) => (k === i ? { ...d, ...patch } : d)));
    const setShift = (i: number, k: number, patch: Partial<ShiftDraft>) =>
        setDay(i, {
            shifts: days[i].shifts.map((s, j) => (j === k ? { ...s, ...patch } : s))
        });
    const addShift = (i: number) => {
        const shifts = days[i].shifts;
        const last = shifts[shifts.length - 1];
        setDay(i, {
            shifts: [...shifts.slice(0, -1), { ...last, nextDay: false }, nextShift(last)]
        });
    };
    const removeShift = (i: number, k: number) =>
        setDay(i, { shifts: days[i].shifts.filter((_, j) => j !== k) });

    const copy = () => {
        if (copyFrom === null) return;
        const source = days[copyFrom];
        onChange(
            days.map((d, i) =>
                targets.includes(i)
                    ? { open: source.open, shifts: source.shifts.map((s) => ({ ...s })) }
                    : d
            )
        );
        setCopyFrom(null);
        setTargets([]);
    };
    const others = DAYS.map((_, i) => i).filter((i) => i !== copyFrom);

    return (
        <div className="space-y-4">
            <ul className="divide-y divide-line/40">
                {days.map((d, i) => (
                    <li key={DAYS[i]} className="space-y-2 py-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <span className="w-24 text-sm font-medium">{DAYS[i]}</span>
                            <label className="flex items-center gap-2 text-sm text-muted">
                                <Switch
                                    label={`${DAYS[i]} aberto`}
                                    checked={d.open}
                                    onChange={(open) => setDay(i, { open })}
                                />{' '}
                                {d.open ? 'Aberto' : 'Fechado'}
                            </label>
                            {d.open && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCopyFrom(i);
                                        setTargets([]);
                                    }}
                                    className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-brand underline-offset-2 hover:underline"
                                >
                                    <Copy className="h-3.5 w-3.5" aria-hidden /> Copiar
                                    para outros dias
                                </button>
                            )}
                        </div>
                        {d.open && (
                            <ul className="space-y-2 sm:pl-28">
                                {d.shifts.map((s, k) => {
                                    const last = k === d.shifts.length - 1;
                                    const label =
                                        d.shifts.length > 1
                                            ? `${DAYS[i]}, turno ${k + 1}`
                                            : DAYS[i];
                                    return (
                                        <li
                                            key={k}
                                            className="flex flex-wrap items-center gap-2 text-sm"
                                        >
                                            {d.shifts.length > 1 && (
                                                <span className="w-14 text-xs text-muted">
                                                    Turno {k + 1}
                                                </span>
                                            )}
                                            <TimeInput
                                                value={s.from}
                                                onChange={(v) =>
                                                    setShift(i, k, { from: v })
                                                }
                                                aria-label={`${label}: abre`}
                                                className="!w-24 text-center"
                                            />
                                            <span className="text-muted">às</span>
                                            <TimeInput
                                                value={s.to}
                                                onChange={(v) =>
                                                    setShift(i, k, {
                                                        to: v,
                                                        ...(isHHMM(v) &&
                                                        isHHMM(s.from) &&
                                                        last
                                                            ? { nextDay: v <= s.from }
                                                            : {})
                                                    })
                                                }
                                                aria-label={`${label}: fecha`}
                                                className="!w-24 text-center"
                                            />
                                            {last && (
                                                <Select
                                                    value={s.nextDay ? 'next' : 'same'}
                                                    onChange={(e) =>
                                                        setShift(i, k, {
                                                            nextDay:
                                                                e.target.value === 'next'
                                                        })
                                                    }
                                                    aria-label={`${label}: fecha em qual dia`}
                                                    className="!w-auto !py-2 text-sm"
                                                >
                                                    <option value="same">
                                                        no mesmo dia
                                                    </option>
                                                    <option value="next">
                                                        no dia seguinte (
                                                        {DAYS[(i + 1) % 7].toLowerCase()})
                                                    </option>
                                                </Select>
                                            )}
                                            {d.shifts.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeShift(i, k)}
                                                    aria-label={`Remover ${label}`}
                                                    className="rounded-pill p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                                                >
                                                    <Trash2
                                                        className="h-4 w-4"
                                                        aria-hidden
                                                    />
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                                {d.shifts.length < HOURS_LIMITS.maxShiftsPerDay && (
                                    <li>
                                        <button
                                            type="button"
                                            onClick={() => addShift(i)}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-brand underline-offset-2 hover:underline"
                                        >
                                            <Plus className="h-3.5 w-3.5" aria-hidden />{' '}
                                            Adicionar turno
                                        </button>
                                    </li>
                                )}
                            </ul>
                        )}
                        {errors[i] && (
                            <p role="alert" className="text-xs text-danger sm:pl-28">
                                {errors[i]}
                            </p>
                        )}
                    </li>
                ))}
            </ul>

            <div className="space-y-2 border-t border-line/40 pt-4">
                <h3 className="text-sm font-semibold">Como fica a semana</h3>
                <WeekPreview hours={toOpeningHours(days)} today={today} />
            </div>
            <p className="text-xs text-muted">
                Cada turno pertence ao dia em que começa: a madrugada depois da meia-noite
                conta como o turno do dia anterior, mesmo que o dia seguinte esteja
                fechado. Para um intervalo no meio do dia, adicione outro turno.
            </p>

            <Modal
                open={copyFrom !== null}
                onClose={() => setCopyFrom(null)}
                title={
                    copyFrom === null
                        ? undefined
                        : `Copiar o horário de ${DAYS[copyFrom].toLowerCase()}`
                }
                sheet
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted">
                        Os turnos escolhidos substituem os que esses dias têm hoje.
                    </p>
                    <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                            type="checkbox"
                            checked={targets.length === others.length}
                            onChange={(e) => setTargets(e.target.checked ? others : [])}
                            className="shrink-0"
                        />{' '}
                        Todos os outros dias
                    </label>
                    <ul className="grid grid-cols-2 gap-2">
                        {others.map((i) => (
                            <li key={i}>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={targets.includes(i)}
                                        onChange={(e) =>
                                            setTargets((t) =>
                                                e.target.checked
                                                    ? [...t, i]
                                                    : t.filter((x) => x !== i)
                                            )
                                        }
                                        className="shrink-0"
                                    />{' '}
                                    {DAYS[i]}
                                </label>
                            </li>
                        ))}
                    </ul>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setCopyFrom(null)}>
                            Cancelar
                        </Button>
                        <Button onClick={copy} disabled={!targets.length}>
                            Copiar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
