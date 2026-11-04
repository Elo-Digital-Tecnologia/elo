import type {
    Availability,
    HoursProblemCode,
    LocalMoment,
    OpenStatus,
    PauseProblem
} from '@elo/core/opening-hours/open-status';
import { HOURS_LIMITS, PAUSE_LIMITS } from '@elo/core/opening-hours/open-status';
import { MINUTES_PER_DAY, MINUTES_PER_HOUR } from '@elo/core/time/time-units';

export const WEEKDAYS = [
    'domingo',
    'segunda',
    'terça',
    'quarta',
    'quinta',
    'sexta',
    'sábado'
];
/** Weekday names as titles ("Segunda"). */
export const DAYS = WEEKDAYS.map((d) => d[0]!.toUpperCase() + d.slice(1));
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const pad = (n: number) => String(n).padStart(2, '0');

/** "hoje às 23:00" or "em 02/11 às 01:00". */
const momentText = (m: LocalMoment) =>
    m.today ? `hoje às ${m.time}` : `em ${pad(m.day)}/${pad(m.month)} às ${m.time}`;

/** "Aberto · fecha às 23:00", "Fechado · abre amanhã às 11:00". */
export function openStatusText(status: OpenStatus): string {
    if (status.open)
        return status.change ? `Aberto · fecha às ${status.change.time}` : 'Aberto';
    if (!status.change) return 'Fechado';
    const { time, daysAhead, weekday } = status.change;
    const when =
        daysAhead === 0 ? 'hoje' : daysAhead === 1 ? 'amanhã' : WEEKDAYS[weekday];
    return `Fechado · abre ${when} às ${time}`;
}

/** Text for guests and staff; null when there are no hours and no closure (always open). */
export function availabilityText(availability: Availability): string | null {
    if (availability.reason === 'pause')
        return availability.until
            ? `Fechado temporariamente · volta ${momentText(availability.until)}`
            : 'Fechado temporariamente';
    if (availability.extra && availability.until)
        return `Aberto fora do horário · até ${availability.until.today ? availability.until.time : momentText(availability.until).replace(/^em /, '')}`;
    return availability.hours ? openStatusText(availability.hours) : null;
}

/** "até 01:00 de segunda", for a shift that closes after midnight. */
export const overnightText = (end: { close: string; weekday: number }) =>
    `até ${end.close} de ${WEEKDAYS[end.weekday]}`;

export const CLOSED_FALLBACK = 'Restaurante fechado';
export const ALWAYS_OPEN = 'Sem horário cadastrado: o restaurante fica sempre aberto.';

export const PAUSE_PROBLEMS: Record<PauseProblem, string> = {
    ends_before_start: 'O fim precisa ser depois do início.',
    starts_in_past: 'O início não pode estar no passado.',
    too_far_ahead: `Agende com no máximo ${PAUSE_LIMITS.aheadDays} dias de antecedência.`,
    overlaps: 'Já existe uma parada nesse período. Encerre ou ajuste a outra antes.',
    opening_needs_end: 'Informe até quando o restaurante fica aberto.',
    opening_too_long: `A abertura fora do horário dura no máximo ${PAUSE_LIMITS.openingMaxHours} horas.`
};

export const PAUSE_FORM_MESSAGES = {
    start_missing: 'Informe quando a parada começa.',
    end_missing: 'Informe quando a parada termina, ou marque "Até reabrir".'
};

export const EXTRA_OPENING_FORM_MESSAGES = {
    end_missing: 'Informe até quando o restaurante fica aberto.'
};

export const HOURS_PROBLEMS: Record<HoursProblemCode, (day: number) => string> = {
    not_a_week: () => 'Os horários da semana estão incompletos.',
    too_many_shifts: () =>
        `Use no máximo ${HOURS_LIMITS.maxShiftsPerDay} turnos por dia.`,
    invalid_time: (d) => `Informe os horários de abrir e fechar de ${DAYS[d]}.`,
    unordered: () => 'Coloque os turnos em ordem: cada um começa depois do anterior.',
    overlap: () =>
        'Os turnos se sobrepõem ou se encostam: deixe um intervalo entre o fechamento de um e a abertura do próximo.',
    overnight_not_last: () =>
        'Só o último turno do dia pode terminar depois da meia-noite.',
    overlaps_next_day: (d) =>
        `O turno termina na madrugada de ${WEEKDAYS[(d + 1) % 7]}, mas o primeiro turno desse dia abre antes disso.`
};

/** How long an extra opening lasts, as offered in the form: label and minutes. */
export const EXTRA_OPENING_DURATIONS: [string, number][] = [
    ['1 hora', MINUTES_PER_HOUR],
    ['2 horas', 2 * MINUTES_PER_HOUR],
    ['3 horas', 3 * MINUTES_PER_HOUR]
];

/** Quick lengths of a temporary closure: label and minutes. */
export const PAUSE_QUICK_DURATIONS: [string, number][] = [
    ['1 hora', MINUTES_PER_HOUR],
    ['3 horas', 3 * MINUTES_PER_HOUR],
    ['1 dia', MINUTES_PER_DAY],
    ['1 semana', 7 * MINUTES_PER_DAY]
];
