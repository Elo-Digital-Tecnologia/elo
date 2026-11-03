import type { OpeningHours, ShiftPiece } from '@elo/core';
import { WEEKDAYS, overnightLabel, weekShifts } from '@elo/core';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const pct = (min: number) => `${(min / 1440) * 100}%`;
const hhmm = (min: number) =>
    `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** "21:00–01:00 (segunda)", with the early hours of the day before's shift first. */
function dayText(hours: OpeningHours, day: number, pieces: ShiftPiece[]): string {
    const shifts = hours[day] ?? [];
    const spill = pieces.find((p) => p.spill);
    const own = shifts
        .map(
            (h, k) =>
                `${h.open}–${h.close}${k === shifts.length - 1 && overnightLabel(day, shifts) ? ` (${WEEKDAYS[(day + 1) % 7]})` : ''}`
        )
        .join(' · ');
    return (
        [spill && `até ${hhmm(spill.to)}, turno de ${WEEKDAYS[spill.day]}`, own]
            .filter(Boolean)
            .join(' · ') || 'Fechado'
    );
}

/**
 * The week on 24 h strips. A shift that closes after midnight runs to the end of its
 * day and shows, hatched, in the early hours of the next one: the early hours of a day
 * belong to the day before.
 */
export function WeekPreview({ hours, today }: { hours: OpeningHours; today?: number }) {
    const week = weekShifts(hours);
    return (
        <figure className="space-y-1.5" aria-label="Prévia do horário da semana">
            {week.map((pieces, day) => (
                <div key={day} className="flex items-center gap-3 text-xs">
                    <span
                        className={`w-9 shrink-0 font-semibold ${day === today ? 'text-brand' : 'text-muted'}`}
                    >
                        {DAY_NAMES[day]}
                    </span>
                    <div className="relative h-6 flex-1 overflow-hidden rounded-pill bg-leaf-100/50">
                        {pieces.map((p) => (
                            <span
                                key={`${p.day}-${p.index}-${p.spill}`}
                                title={
                                    p.spill
                                        ? `Madrugada do turno de ${WEEKDAYS[p.day]}: até ${hhmm(p.to)}`
                                        : `${hhmm(p.from)} às ${p.to === 1440 ? '24:00' : hhmm(p.to)}`
                                }
                                className={`absolute inset-y-0 ${p.spill ? 'bg-brand/45' : 'bg-brand'}`}
                                style={{
                                    left: pct(p.from),
                                    width: pct(p.to - p.from),
                                    ...(p.spill
                                        ? {
                                              backgroundImage:
                                                  'repeating-linear-gradient(135deg, transparent 0 4px, hsl(var(--elo-brand-fg) / 0.35) 4px 7px)'
                                          }
                                        : {})
                                }}
                            />
                        ))}
                    </div>
                    <span className="w-56 shrink-0 truncate text-muted max-sm:hidden">
                        {dayText(hours, day, pieces)}
                    </span>
                </div>
            ))}
            <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-12 pt-1 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-4 rounded-pill bg-brand" /> Turno do dia
                </span>
                <span className="flex items-center gap-1.5">
                    <span
                        className="h-2.5 w-4 rounded-pill bg-brand/45"
                        style={{
                            backgroundImage:
                                'repeating-linear-gradient(135deg, transparent 0 3px, hsl(var(--elo-brand-fg) / 0.35) 3px 5px)'
                        }}
                    />{' '}
                    Madrugada do turno do dia anterior
                </span>
            </figcaption>
        </figure>
    );
}
