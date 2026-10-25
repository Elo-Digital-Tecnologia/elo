// Select — Base select component
'use client';

import { forwardRef, SelectHTMLAttributes, useId } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Text } from '../primitives/Text';

const selectVariants = tv({
  base: 'glass-input w-full appearance-none transition-all duration-fast placeholder:text-[var(--color-muted-foreground)] disabled:opacity-50 disabled:cursor-not-allowed',
  variants: {
    size: {
      sm: 'text-body-sm px-3 py-2 rounded-md pr-8',
      md: 'text-body px-4 py-2.5 rounded-lg pr-10',
      lg: 'text-body-lg px-4 py-3 rounded-lg pr-10'
    },
    state: {
      default: '',
      error: 'border-[var(--color-destructive)] focus:border-[var(--color-destructive)] focus:ring-[var(--color-destructive)]',
      success: 'border-[var(--color-status-success)] focus:border-[var(--color-status-success)] focus:ring-[var(--color-status-success)]'
    }
  },
  defaultVariants: {
    size: 'md',
    state: 'default'
  }
});

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: keyof typeof selectVariants.variants.size;
  state?: keyof typeof selectVariants.variants.state;
  showIcon?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({
    className,
    label,
    hint,
    error,
    options,
    placeholder,
    size = 'md',
    state = 'default',
    showIcon = true,
    id: providedId,
    required,
    disabled,
    ...props
  }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const ariaDescribedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    const selectState = error ? 'error' : state;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={id} className="text-label">
            {label}
            {required && <span className="text-[var(--color-destructive)] ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={cn(selectVariants({ size, state: selectState }), className)}
            disabled={disabled}
            required={required}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={ariaDescribedBy}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          {showIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-muted-foreground)]">
              <Icon name="chevronDown" size="sm" aria-hidden="true" />
            </div>
          )}
        </div>
        {error && (
          <Text id={errorId} as="p" color="destructive" size="body-sm" role="alert">
            {error}
          </Text>
        )}
        {hint && !error && (
          <Text id={hintId} as="p" color="muted" size="body-sm">
            {hint}
          </Text>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';