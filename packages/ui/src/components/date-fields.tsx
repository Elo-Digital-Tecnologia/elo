'use client';

import { CalendarDays } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/** "2026-11-14" ↔ "14/11/2026". */
const toBR = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

function fromBR(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}

const maskDate = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
};

const maskTime = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
};

const validTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

interface Common {
  /** Lets a form focus the field when it holds the first error. */
  name?: string;
  onBlur?: () => void;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  'aria-label'?: string;
  id?: string;
  className?: string;
}

/**
 * Brazilian date field: typed as dd/mm/aaaa whatever the browser language, with the
 * calendar one tap away. The value stays YYYY-MM-DD; it only changes once the date
 * is complete, valid and inside `min`/`max`.
 */
export function DateInput({ value, onChange, min, max, required, disabled, invalid, id, name, onBlur, className = '', ...rest }: Common & { value: string; onChange: (iso: string) => void; min?: string; max?: string }) {
  const [text, setText] = useState(toBR(value));
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => setText(toBR(value)), [value]);

  const type = (raw: string) => {
    const next = maskDate(raw);
    setText(next);
    if (!next && !required) return onChange('');
    const iso = fromBR(next);
    if (iso && (!min || iso >= min) && (!max || iso <= max)) onChange(iso);
  };

  const outside = (() => {
    const iso = fromBR(text);
    return text.length === 10 && (!iso || (!!min && iso < min) || (!!max && iso > max));
  })();

  return (
    <span className={`relative flex items-center ${className}`}>
      <input
        id={id}
        name={name}
        value={text}
        onChange={(e) => type(e.target.value)}
        onBlur={() => {
          setText(toBR(value));
          onBlur?.();
        }}
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        required={required}
        disabled={disabled}
        aria-invalid={invalid || outside || undefined}
        aria-label={rest['aria-label']}
        className="!pr-11 tabular-nums"
      />
      <button
        type="button"
        disabled={disabled}
        aria-label="Abrir calendário"
        onClick={() => picker.current?.showPicker?.()}
        className="absolute right-1.5 grid shrink-0 h-9 w-9 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-brand"
      >
        <CalendarDays size={18} />
      </button>
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value}
        min={min}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="pointer-events-none absolute bottom-0 right-0 !h-px !min-h-0 !w-px opacity-0"
      />
    </span>
  );
}

/** 24-hour time typed as HH:MM; the value only changes once the time is complete and valid. */
export function TimeInput({ value, onChange, required, disabled, invalid, id, name, onBlur, className = '', ...rest }: Common & { value: string; onChange: (hhmm: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const type = (raw: string) => {
    const next = maskTime(raw);
    setText(next);
    if (validTime(next)) onChange(next);
  };
  return (
    <input
      id={id}
      name={name}
      value={text}
      onChange={(e) => type(e.target.value)}
      onBlur={() => {
        setText(value);
        onBlur?.();
      }}
      inputMode="numeric"
      placeholder="hh:mm"
      maxLength={5}
      required={required}
      disabled={disabled}
      aria-invalid={invalid || (text.length === 5 && !validTime(text)) || undefined}
      aria-label={rest['aria-label']}
      className={`tabular-nums ${className}`}
    />
  );
}

/** Date and time side by side; the value is the `datetime-local` format, YYYY-MM-DDTHH:MM. */
export function DateTimeInput({ value, onChange, min, required, disabled, invalid, name, onBlur, 'aria-label': label }: Common & { value: string; onChange: (v: string) => void; min?: string }) {
  const [date, time] = value ? [value.slice(0, 10), value.slice(11, 16)] : ['', ''];
  return (
    <span className="grid grid-cols-[1fr_7rem] gap-2">
      <DateInput name={name} onBlur={onBlur} invalid={invalid} value={date} min={min?.slice(0, 10)} onChange={(d) => onChange(d ? `${d}T${time || '00:00'}` : '')} required={required} disabled={disabled} aria-label={label ? `${label}: data` : 'Data'} />
      <TimeInput onBlur={onBlur} invalid={invalid} value={time} onChange={(t) => onChange(`${date || (min ?? '').slice(0, 10)}T${t}`)} required={required} disabled={disabled} aria-label={label ? `${label}: hora` : 'Hora'} />
    </span>
  );
}
