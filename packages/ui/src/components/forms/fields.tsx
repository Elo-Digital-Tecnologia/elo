'use client';

import type {
    InputHTMLAttributes,
    ReactNode,
    SelectHTMLAttributes,
    TextareaHTMLAttributes
} from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { useUiTexts } from '../../texts/ui-texts';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
    /** Icon on the left. */
    icon?: ReactNode;
    invalid?: boolean;
};

/** Text field with an optional icon. The base look comes from the global field CSS. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { icon, invalid, className = '', ...rest },
    ref
) {
    return (
        <span className="field-wrap">
            {icon && <span className="field-lead">{icon}</span>}
            <input
                ref={ref}
                aria-invalid={invalid || undefined}
                className={className}
                {...rest}
            />
        </span>
    );
});

/** Password with a button to show or hide it. */
export const PasswordInput = forwardRef<
    HTMLInputElement,
    Omit<InputProps, 'type' | 'icon'>
>(function PasswordInput({ className = '', invalid, ...rest }, ref) {
    const t = useUiTexts();
    const [shown, setShown] = useState(false);
    return (
        <span className="field-wrap">
            <input
                ref={ref}
                type={shown ? 'text' : 'password'}
                aria-invalid={invalid || undefined}
                className={`!pr-12 ${className}`}
                {...rest}
            />
            <span className="field-tail">
                <button
                    type="button"
                    onClick={() => setShown((v) => !v)}
                    aria-label={shown ? t.hidePassword : t.showPassword}
                    aria-pressed={shown}
                    className="grid shrink-0 h-9 w-9 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-fg"
                >
                    {shown ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
            </span>
        </span>
    );
});

/** Amount in reais: accepts "12,50" and gives back the typed text; use parseCents from core to convert. */
export const MoneyInput = forwardRef<
    HTMLInputElement,
    Omit<InputProps, 'icon' | 'inputMode'>
>(function MoneyInput({ className = '', invalid, ...rest }, ref) {
    const t = useUiTexts();
    return (
        <span className="field-wrap">
            <span className="field-lead text-sm font-medium">R$</span>
            <input
                ref={ref}
                inputMode="decimal"
                placeholder={t.moneyPlaceholder}
                aria-invalid={invalid || undefined}
                className={className}
                {...rest}
            />
        </span>
    );
});

/** Multi-line text with the same invalid state as `Input`. */
export const Textarea = forwardRef<
    HTMLTextAreaElement,
    TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ invalid, ...rest }, ref) {
    return <textarea ref={ref} aria-invalid={invalid || undefined} {...rest} />;
});

/** List picker with the same invalid state as `Input`. */
export const Select = forwardRef<
    HTMLSelectElement,
    SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ invalid, ...rest }, ref) {
    return <select ref={ref} aria-invalid={invalid || undefined} {...rest} />;
});

/** Interruptor liga/desliga. */
export function Switch({
    checked,
    onChange,
    label,
    disabled
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    label: string;
    disabled?: boolean;
}) {
    return (
        <span className="switch">
            <input
                type="checkbox"
                role="switch"
                aria-label={label}
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
            />
            <i aria-hidden />
        </span>
    );
}

/** Indicador de carregamento. */
export function Spinner({ size = 22 }: { size?: number }) {
    const t = useUiTexts();
    return (
        <Loader2
            size={size}
            className="animate-spin text-brand"
            role="status"
            aria-label={t.loading}
        />
    );
}
