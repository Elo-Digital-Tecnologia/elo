// Switch — Base switch/toggle component
'use client';

import { forwardRef, InputHTMLAttributes, useId } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';

const switchVariants = tv({
  base: 'relative inline-flex items-center gap-3 cursor-pointer select-none',
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

const switchTrackVariants = tv({
  base: 'relative flex-shrink-0 rounded-full transition-all duration-fast focus-ring',
  variants: {
    size: {
      sm: 'w-8 h-4',
      md: 'w-11 h-6',
      lg: 'w-14 h-7'
    },
    state: {
      default: 'bg-[var(--color-border)] checked:bg-[var(--color-primary)]',
      error: 'bg-[var(--color-border)] checked:bg-[var(--color-destructive)]'
    }
  },
  defaultVariants: {
    size: 'md',
    state: 'default'
  }
});

const switchThumbVariants = tv({
  base: 'absolute top-1/2 left-1 bg-white rounded-full shadow-sm transition-transform duration-fast ease-spring transform -translate-y-1/2',
  variants: {
    size: {
      sm: 'w-3 h-3 translate-x-0 peer-checked:translate-x-5',
      md: 'w-4 h-4 translate-x-0 peer-checked:translate-x-6',
      lg: 'w-5 h-5 translate-x-0 peer-checked:translate-x-8'
    }
  },
  defaultVariants: {
    size: 'md'
  }
});

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  size?: keyof typeof switchVariants.variants.size;
  state?: keyof typeof switchTrackVariants.variants.state;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({
    className,
    label,
    description,
    size = 'md',
    state = 'default',
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
      <div className={cn(switchVariants({ size }), className)}>
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          id={id}
          className={cn('sr-only peer')}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          aria-checked={checked}
          aria-describedby={ariaDescribedBy}
          aria-required={required}
          aria-disabled={disabled}
          {...props}
        />
        <div
          className={cn(
            switchTrackVariants({ size, state }),
            'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-ring)] peer-focus-visible:ring-offset-2',
            'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed'
          )}
          aria-hidden="true"
        >
          <div className={cn(switchThumbVariants({ size }))} />
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
              <span id={descriptionId} className="text-body-sm text-[var(--color-muted-foreground)]">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';