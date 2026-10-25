// Checkbox — Base checkbox component
'use client';

import { forwardRef, InputHTMLAttributes, useId } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Text } from '../primitives/Text';

const checkboxVariants = tv({
  base: 'relative flex items-center gap-3 cursor-pointer select-none',
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

const checkboxInputVariants = tv({
  base: 'appearance-none flex-shrink-0 transition-all duration-fast focus-ring rounded border-2',
  variants: {
    size: {
      sm: 'w-4 h-4 border-[1.5px]',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    },
    state: {
      default: 'border-[var(--color-border)] bg-[var(--color-surface)] checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)]',
      error: 'border-[var(--color-destructive)] bg-[var(--color-surface)] checked:bg-[var(--color-destructive)] checked:border-[var(--color-destructive)]'
    }
  },
  defaultVariants: {
    size: 'md',
    state: 'default'
  }
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  size?: keyof typeof checkboxVariants.variants.size;
  state?: keyof typeof checkboxInputVariants.variants.state;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({
    className,
    label,
    description,
    size = 'md',
    state = 'default',
    indeterminate = false,
    id: providedId,
    required,
    disabled,
    checked,
    onChange,
    ...props
  }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const descriptionId = description ? `${id}-description` : undefined;
    const ariaDescribedBy = descriptionId ? descriptionId : undefined;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) onChange(e);
    };

    return (
      <div className={cn(checkboxVariants({ size }), className)}>
        <input
          ref={ref}
          type="checkbox"
          id={id}
          className={cn(checkboxInputVariants({ size, state }), 'sr-only peer')}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          aria-checked={indeterminate ? 'mixed' : checked}
          aria-describedby={ariaDescribedBy}
          aria-required={required}
          aria-disabled={disabled}
          {...props}
        />
        <div
          className={cn(
            checkboxInputVariants({ size, state }),
            'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-ring)] peer-focus-visible:ring-offset-2',
            'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
            'checked:peer/[flex] items-center justify-center'
          )}
          aria-hidden="true"
        >
          {indeterminate ? (
            <Icon name="minus" size="xs" className="text-[var(--color-primary-foreground)]" strokeWidth={3} />
          ) : checked ? (
            <Icon name="check" size="xs" className="text-[var(--color-primary-foreground)]" strokeWidth={3} />
          ) : null}
        </div>
        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <label htmlFor={id} className="text-label cursor-pointer select-none">
                {label}
                {required && <span className="text-[var(--color-destructive)] ml-0.5" aria-hidden="true">*</span>}
              </label>
            )}
            {description && (
              <Text id={descriptionId} as="p" color="muted" size="body-sm">
                {description}
              </Text>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';