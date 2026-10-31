'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  /** Ícone à esquerda. */
  icon?: ReactNode;
  invalid?: boolean;
};

/** Campo de texto com ícone opcional. O visual base vem do CSS global de campos. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ icon, invalid, className = '', ...rest }, ref) {
  return (
    <span className="field-wrap">
      {icon && <span className="field-lead">{icon}</span>}
      <input ref={ref} aria-invalid={invalid || undefined} className={className} {...rest} />
    </span>
  );
});

/** Senha com botão para mostrar ou ocultar. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'icon'>>(function PasswordInput(
  { className = '', ...rest },
  ref,
) {
  const [shown, setShown] = useState(false);
  return (
    <span className="field-wrap">
      <input ref={ref} type={shown ? 'text' : 'password'} className={`!pr-12 ${className}`} {...rest} />
      <span className="field-tail">
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={shown}
          className="grid shrink-0 h-9 w-9 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-fg"
        >
          {shown ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </span>
  );
});

/** Campo de valor em reais: aceita "12,50" e devolve o texto digitado; use parseCents do core para converter. */
export const MoneyInput = forwardRef<HTMLInputElement, Omit<InputProps, 'icon' | 'inputMode'>>(function MoneyInput(
  { className = '', ...rest },
  ref,
) {
  return (
    <span className="field-wrap">
      <span className="field-lead text-sm font-medium">R$</span>
      <input ref={ref} inputMode="decimal" placeholder="0,00" className={className} {...rest} />
    </span>
  );
});

/** Interruptor liga/desliga. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <span className="switch">
      <input type="checkbox" role="switch" aria-label={label} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden />
    </span>
  );
}

/** Indicador de carregamento. */
export function Spinner({ size = 22 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-brand" role="status" aria-label="Carregando" />;
}
