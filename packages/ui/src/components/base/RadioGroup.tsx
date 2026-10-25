// RadioGroup — Base radio group component
'use client';

import { forwardRef, InputHTMLAttributes, useId, useState } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Text } from '../primitives/Text';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

const radioGroupVariants = tv({
  base: 'flex flex-col gap-3',
  variants: {
    direction: {
      vertical: 'flex-col',
      horizontal: 'flex-row flex-wrap gap-4'
    }
  },
  defaultVariants: {
    direction: 'vertical'
  }
});

const radioItemVariants = tv({
  base: 'relative flex items-start gap-3 cursor-pointer select-none',
  variants: {
    size: {
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-3'
    }
  },
  defaultVariants: {
    size: 'md'
  }
});

const radioInputVariants = tv({
  base: 'appearance-none flex-shrink-0 mt-0.5 transition-all duration-fast focus-ring rounded-full border-2',
  variants: {
    size: {
      sm: 'w-4 h-4 border-[1.5px]',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    },
    state: {
      default: 'border-[var(--color-border)] bg-[var(--color-surface)] checked:border-[var(--color-primary)]',
      error: 'border-[var(--color-destructive)] bg-[var(--color-surface)] checked:border-[var(--color-destructive)]'
    }
  },
  defaultVariants: {
    size: 'md',
    state: 'default'
  }
});

export interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  direction?: keyof typeof radioGroupVariants.variants.direction;
  size?: keyof typeof radioItemVariants.variants.size;
  state?: keyof typeof radioInputVariants.variants.state;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
}

export const RadioGroup = forwardRef<HTMLFieldSetElement, RadioGroupProps>(
  ({
    className,
    name,
    value,
    onChange,
    options,
    direction = 'vertical',
    size = 'md',
    state = 'default',
    required,
    disabled,
    label,
    hint,
    error,
    ...props
  }, ref) => {
    const groupId = useId();
    const errorId = error ? `${groupId}-error` : undefined;
    const hintId = hint ? `${groupId}-hint` : undefined;
    const ariaDescribedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) onChange(e.target.value);
    };

    return (
      <fieldset
        ref={ref}
        className={cn(radioGroupVariants({ direction }), className)}
        aria-describedby={ariaDescribedBy}
        aria-invalid={error ? 'true' : 'false'}
        {...props}
      >
        {label && (
          <legend className="text-label">
            {label}
            {required && <span className="text-[var(--color-destructive)] ml-0.5" aria-hidden="true">*</span>}
          </legend>
        )}
        <div className={cn(radioGroupVariants({ direction }), 'pt-1')}>
          {options.map(option => (
            <label
              key={option.value}
              className={cn(radioItemVariants({ size }))}
              htmlFor={`${name}-${option.value}`}
            >
              <input
                type="radio"
                id={`${name}-${option.value}`}
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={handleChange}
                disabled={disabled || option.disabled}
                required={required}
                className={cn(
                  radioInputVariants({ size, state }),
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-ring)] peer-focus-visible:ring-offset-2',
                  'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
                  'checked:peer/[flex] items-center justify-center'
                )}
                aria-describedby={ariaDescribedBy}
                aria-required={required}
                aria-disabled={disabled || option.disabled}
              />
              <div
                className={cn(
                  radioInputVariants({ size, state }),
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-ring)] peer-focus-visible:ring-offset-2',
                  'checked:peer/[flex] items-center justify-center'
                )}
                aria-hidden="true"
              >
                <div className="w-full h-full rounded-full bg-[var(--color-primary)] scale-0 peer-checked:scale-100 transition-transform duration-fast ease-spring" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <Text as="span" weight="medium" color="default">
                  {option.label}
                </Text>
                {option.description && (
                  <Text as="p" color="muted" size="body-sm">
                    {option.description}
                  </Text>
                )}
              </div>
            </label>
          ))}
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
      </fieldset>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';