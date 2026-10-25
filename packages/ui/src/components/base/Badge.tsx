// Badge — Status/badge component
'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';

const badgeVariants = tv({
  base: 'inline-flex items-center gap-1.5 font-medium rounded-full transition-colors duration-fast',
  variants: {
    variant: {
      default: 'glass-subtle text-[var(--glass-text)]',
      primary: 'glass-primary text-[var(--color-primary-foreground)]',
      secondary: 'glass-secondary text-[var(--color-secondary-foreground)]',
      accent: 'glass-accent text-[var(--color-accent-foreground)]',
      success: 'bg-[var(--color-status-success-bg)] text-[var(--color-status-success)] border border-[var(--color-status-success)]/20',
      warning: 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning)] border border-[var(--color-status-warning)]/20',
      error: 'bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] border border-[var(--color-status-error)]/20',
      info: 'bg-[var(--color-status-info-bg)] text-[var(--color-status-info)] border border-[var(--color-status-info)]/20',
      outline: 'glass border-[var(--glass-border)] text-[var(--glass-text)]',
      ghost: 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]'
    },
    size: {
      xs: 'text-body-xs px-2 py-0.5 gap-1',
      sm: 'text-body-sm px-2.5 py-1 gap-1',
      md: 'text-body-sm px-3 py-1 gap-1.5',
      lg: 'text-body px-3 py-1.5 gap-1.5',
      xl: 'text-body-lg px-4 py-2 gap-2'
    },
    dot: {
      true: '',
      false: ''
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
    dot: false
  },
  compoundVariants: [
    {
      variant: 'default',
      dot: true,
      className: 'before:content-[""] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:mr-1'
    },
    {
      variant: 'primary',
      dot: true,
      className: 'before:content-[""] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[var(--color-primary-foreground)] before:mr-1'
    },
    {
      variant: 'success',
      dot: true,
      className: 'before:content-[""] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:mr-1'
    },
    {
      variant: 'warning',
      dot: true,
      className: 'before:content-[""] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:mr-1'
    },
    {
      variant: 'error',
      dot: true,
      className: 'before:content-[""] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:mr-1'
    },
    {
      variant: 'info',
      dot: true,
      className: 'before:content-[""] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:mr-1'
    }
  ]
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants.variants.variant;
  size?: keyof typeof badgeVariants.variants.size;
  dot?: boolean;
  icon?: keyof typeof Icons;
  removable?: boolean;
  onRemove?: () => void;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({
    className,
    variant = 'default',
    size = 'md',
    dot = false,
    icon,
    removable = false,
    onRemove,
    children,
    ...props
  }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, dot }), className)}
        {...props}
      >
        {icon && !dot && <Icon name={icon} size="xs" aria-hidden="true" />}
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="flex-shrink-0 p-0.5 rounded-full hover:bg-black/10 hover:text-current transition-colors"
            aria-label="Remover"
          >
            <Icon name="x" size="xs" strokeWidth={3} aria-hidden="true" />
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';