// Separator — Visual divider component
'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';

const separatorVariants = tv({
  base: 'flex items-center gap-4',
  variants: {
    orientation: {
      horizontal: 'w-full',
      vertical: 'h-full'
    },
    variant: {
      default: 'border-t border-[var(--color-border)]',
      dashed: 'border-t border-dashed border-[var(--color-border)]',
      dotted: 'border-t border-dotted border-[var(--color-border)]',
      thick: 'border-t-2 border-[var(--color-border)]',
      glass: 'border-t border-[var(--glass-border)]'
    },
    withText: {
      true: '',
      false: ''
    }
  },
  defaultVariants: {
    orientation: 'horizontal',
    variant: 'default',
    withText: false
  }
});

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: keyof typeof separatorVariants.variants.orientation;
  variant?: keyof typeof separatorVariants.variants.variant;
  label?: string;
  labelPosition?: 'start' | 'center' | 'end';
}

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({
    className,
    orientation = 'horizontal',
    variant = 'default',
    label,
    labelPosition = 'center',
    ...props
  }, ref) => {
    const withText = !!label;

    if (orientation === 'vertical') {
      return (
        <div
          ref={ref}
          className={cn(separatorVariants({ orientation, variant, withText }), className)}
          role="separator"
          aria-orientation="vertical"
          {...props}
        >
          {label && (
            <span className="text-body-xs text-[var(--color-muted-foreground)] whitespace-nowrap">
              {label}
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(separatorVariants({ orientation, variant, withText }), className)}
        role="separator"
        aria-orientation="horizontal"
        {...props}
      >
        {label && labelPosition === 'start' && (
          <span className="text-body-xs text-[var(--color-muted-foreground)] shrink-0">
            {label}
          </span>
        )}
        <div className="flex-1" />
        {label && labelPosition === 'center' && (
          <span className="text-body-xs text-[var(--color-muted-foreground)] shrink-0 px-4">
            {label}
          </span>
        )}
        <div className="flex-1" />
        {label && labelPosition === 'end' && (
          <span className="text-body-xs text-[var(--color-muted-foreground)] shrink-0">
            {label}
          </span>
        )}
      </div>
    );
  }
);

Separator.displayName = 'Separator';