// Input — Base input component with variants
'use client';

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, useId } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Text } from '../primitives/Text';

const inputVariants = tv({
  base: 'glass-input w-full transition-all duration-fast placeholder:text-[var(--color-muted-foreground)] disabled:opacity-50 disabled:cursor-not-allowed',
  variants: {
    size: {
      sm: 'text-body-sm px-3 py-2 rounded-md',
      md: 'text-body px-4 py-2.5 rounded-lg',
      lg: 'text-body-lg px-4 py-3 rounded-lg'
    },
    state: {
      default: '',
      error: 'border-[var(--color-destructive)] focus:border-[var(--color-destructive)] focus:ring-[var(--color-destructive)]',
      success: 'border-[var(--color-status-success)] focus:border-[var(--color-status-success)] focus:ring-[var(--color-status-success)]'
    },
    fullWidth: {
      true: 'w-full',
      false: ''
    }
  },
  defaultVariants: {
    size: 'md',
    state: 'default',
    fullWidth: true
  }
});

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: keyof typeof Icons;
  rightIcon?: keyof typeof Icons;
  rightElement?: React.ReactNode;
  size?: keyof typeof inputVariants.variants.size;
  state?: keyof typeof inputVariants.variants.state;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    label,
    hint,
    error,
    leftIcon,
    rightIcon,
    rightElement,
    size = 'md',
    state = 'default',
    fullWidth = true,
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

    const inputState = error ? 'error' : state;

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={id} className="text-label">
            {label}
            {required && <span className="text-[var(--color-destructive)] ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] pointer-events-none">
              <Icon name={leftIcon} size="md" aria-hidden="true" />
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              inputVariants({ size, state: inputState, fullWidth }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              rightElement && 'pr-12',
              className
            )}
            disabled={disabled}
            required={required}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={ariaDescribedBy}
            {...props}
          />
          {(rightIcon || rightElement) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {rightElement}
              {rightIcon && (
                <Icon name={rightIcon} size="md" className="text-[var(--color-muted-foreground)]" aria-hidden="true" />
              )}
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

Input.displayName = 'Input';

// Textarea component
const textareaVariants = tv({
  base: 'glass-input w-full resize-y transition-all duration-fast placeholder:text-[var(--color-muted-foreground)] disabled:opacity-50 disabled:cursor-not-allowed',
  variants: {
    size: {
      sm: 'text-body-sm px-3 py-2 rounded-md',
      md: 'text-body px-4 py-2.5 rounded-lg',
      lg: 'text-body-lg px-4 py-3 rounded-lg'
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

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  size?: keyof typeof textareaVariants.variants.size;
  state?: keyof typeof textareaVariants.variants.state;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    label,
    hint,
    error,
    size = 'md',
    state = 'default',
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

    const textareaState = error ? 'error' : state;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={id} className="text-label">
            {label}
            {required && <span className="text-[var(--color-destructive)] ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(textareaVariants({ size, state: textareaState }), className)}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={ariaDescribedBy}
          {...props}
        />
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

Textarea.displayName = 'Textarea';