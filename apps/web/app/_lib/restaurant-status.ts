import type { TrialStatus } from '@elo/core/contracts/contracts';
import type { RestaurantStatus } from '@elo/core/subscription/subscription';

export const STATUS_TONE: Record<
    RestaurantStatus,
    'success' | 'warning' | 'danger' | 'neutral'
> = {
    active: 'success',
    grace: 'warning',
    suspended: 'danger',
    pending: 'neutral',
    ended: 'danger'
};

/** A calendar day (YYYY-MM-DD) as dd/mm/aaaa, without going through a time zone. */
export const dayBR = (day: string) =>
    `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;

export const plural = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`;

/** How the pilot's free trial stands, in one line; null when there is none to tell. */
export function trialLine(trial: TrialStatus): string | null {
    if (trial.state === 'none' || !trial.endsOn || !trial.billingStartsOn) return null;
    const days = plural(trial.days, 'dia', 'dias');
    switch (trial.state) {
        case 'scheduled':
            return `Teste de ${days} a partir de ${dayBR(trial.startsOn!)}.`;
        case 'running':
            return `Em teste até ${dayBR(trial.endsOn)} (${trial.daysLeft === 0 ? 'último dia' : `faltam ${plural(trial.daysLeft!, 'dia', 'dias')}`}). A cobrança começa em ${dayBR(trial.billingStartsOn)}.`;
        case 'finished':
            return `Teste de ${days} concluído em ${dayBR(trial.endsOn)}.`;
        case 'ended_early':
            return `Teste encerrado antes do previsto, em ${dayBR(trial.billingStartsOn)}.`;
        case 'ended_by_conversion':
            return `Teste encerrado na conversão em definitivo, em ${dayBR(trial.billingStartsOn)}.`;
    }
}
