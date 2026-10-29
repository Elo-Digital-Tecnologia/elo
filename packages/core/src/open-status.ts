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

/**
 * Situação do restaurante agora, no fuso dele. Devolve `null` quando não há horário
 * cadastrado (o cardápio então não mostra nada).
 */
export function openStatus(hours: OpeningHours | null | undefined, now: Date, timeZone: string): OpenStatus | null {
  if (!Array.isArray(hours) || hours.length !== 7) return null;
  const { dow, minute } = localClock(now, timeZone);
  const today = hours[dow];
  const yesterday = hours[(dow + 6) % 7];

  // Turno de ontem que atravessa a meia-noite ainda vale agora.
  if (yesterday && minutes(yesterday.close) <= minutes(yesterday.open) && minute < minutes(yesterday.close)) {
    return { open: true, label: `Aberto · fecha às ${yesterday.close}` };
  }
  if (today) {
    const o = minutes(today.open);
    const c = minutes(today.close);
    const overnight = c <= o;
    if (minute >= o && (overnight || minute < c)) return { open: true, label: `Aberto · fecha às ${today.close}` };
    if (minute < o) return { open: false, label: `Fechado · abre hoje às ${today.open}` };
  }
  for (let k = 1; k <= 7; k++) {
    const next = hours[(dow + k) % 7];
    if (!next) continue;
    const when = k === 1 ? 'amanhã' : WEEKDAYS[(dow + k) % 7];
    return { open: false, label: `Fechado · abre ${when} às ${next.open}` };
  }
  return { open: false, label: 'Fechado' };
}
