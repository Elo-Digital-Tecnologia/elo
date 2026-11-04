import {
    MINUTES_PER_DAY,
    MINUTES_PER_HOUR,
    MS_PER_MINUTE,
    SECONDS_PER_MINUTE
} from '@elo/core/time/time-units';

/** "45 s", "3 min", "1 h 05 min"; a dash when there is nothing to average. */
export function formatDuration(seconds: number | null): string {
    if (seconds === null) return '—';
    if (seconds < SECONDS_PER_MINUTE) return `${Math.round(seconds)} s`;
    const minutes = Math.round(seconds / SECONDS_PER_MINUTE);
    if (minutes < MINUTES_PER_HOUR) return `${minutes} min`;
    return `${Math.floor(minutes / MINUTES_PER_HOUR)} h ${String(minutes % MINUTES_PER_HOUR).padStart(2, '0')} min`;
}

/** "2 dias e 3 h", "5 h 30 min", "45 min". */
export function lasted(ms: number) {
    const minutes = Math.max(1, Math.round(ms / MS_PER_MINUTE));
    const days = Math.floor(minutes / MINUTES_PER_DAY);
    const hours = Math.floor((minutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
    const rest = minutes % MINUTES_PER_HOUR;
    if (days)
        return `${days} ${days === 1 ? 'dia' : 'dias'}${hours ? ` e ${hours} h` : ''}`;
    if (hours) return `${hours} h${rest ? ` ${String(rest).padStart(2, '0')} min` : ''}`;
    return `${rest} min`;
}
