// Button — Base button component with variants
'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';

const buttonVariants = tv({
  base: 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-fast focus-ring pressable disabled:opacity-50 disabled:cursor-not-allowed disabled:pressable-false select-none',
  variants: {
    variant: {
      primary: 'glass-primary text-[var(--color-primary-foreground)] hover:bg-[var(--glass-bg-hover)] active:bg-[var(--glass-bg-pressed)]',
      secondary: 'glass-secondary text-[var(--color-secondary-foreground)] hover:bg-[var(--glass-bg-hover)] active:bg-[var(--glass-bg-pressed)]',
      outline: 'glass border-[var(--glass-border)] text-[var(--color-foreground)] hover:bg-[var(--glass-bg-hover)] active:bg-[var(--glass-bg-pressed)]',
      ghost: 'text-[var(--color-foreground)] hover:bg-[var(--color-muted)] active:bg-[var(--color-border)]',
      destructive: 'glass-destructive text-[var(--color-destructive-foreground)] hover:bg-[var(--glass-bg-hover)] active:bg-[var(--glass-bg-pressed)]',
      success: 'bg-[var(--color-status-success)] text-white hover:opacity-90 active:opacity-80',
      link: 'text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] underline-offset-2 hover:underline',
      glass: 'glass text-[var(--glass-text)] hover:bg-[var(--glass-bg-hover)] active:bg-[var(--glass-bg-pressed)]',
      'glass-dark': 'glass-dark text-[var(--glass-text-inverse)] hover:bg-[var(--glass-bg-hover)] active:bg-[var(--glass-bg-pressed)]'
    },
    size: {
      xs: 'text-button-sm px-2.5 py-1.5 rounded-md gap-1',
      sm: 'text-button-sm px-3 py-2 rounded-lg gap-1.5',
      md: 'text-button px-4 py-2.5 rounded-lg gap-2',
      lg: 'text-button-lg px-6 py-3.5 rounded-xl gap-2',
      xl: 'text-button-lg px-8 py-4.5 rounded-xl gap-2.5',
      icon: 'p-2 rounded-lg',
      'icon-sm': 'p-1.5 rounded-md',
      'icon-lg': 'p-3 rounded-xl'
    },
    fullWidth: {
      true: 'w-full',
      false: ''
    },
    loading: {
      true: 'relative pr-8',
      false: ''
    }
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    fullWidth: false,
    loading: false
  },
  compoundVariants: [
    {
      variant: 'glass',
      size: 'icon',
      className: 'p-2'
    },
    {
      variant: 'link',
      size: 'icon',
      className: 'p-0'
    }
  ]
});

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variants.variant;
  size?: keyof typeof buttonVariants.variants.size;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: keyof typeof Icons;
  rightIcon?: keyof typeof Icons;
  iconOnly?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    leftIcon,
    rightIcon,
    iconOnly = false,
    disabled,
    children,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, fullWidth, loading }),
          className
        )}
        disabled={isDisabled}
        aria-busy={loading}
        aria-disabled={isDisabled}
        {...props}
      >
        {loading && (
          <span className="absolute left-3 flex h-full items-center">
            <Icon name="loader" size="sm" animated aria-hidden="true" />
          </span>
        )}
        {!loading && leftIcon && !iconOnly && (
          <Icon name={leftIcon} size={size === 'xs' || size === 'sm' ? 'sm' : 'md'} aria-hidden="true" />
        )}
        <span className={cn('flex items-center', iconOnly && 'sr-only')}>
          {children}
        </span>
        {!loading && rightIcon && !iconOnly && (
          <Icon name={rightIcon} size={size === 'xs' || size === 'sm' ? 'sm' : 'md'} aria-hidden="true" />
        )}
        {!children && !iconOnly && leftIcon && (
          <span className="sr-only">{leftIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';