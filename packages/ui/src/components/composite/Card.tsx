// Card — Liquid glass card component
'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';

const cardVariants = tv({
  base: 'rounded-xl transition-all duration-normal',
  variants: {
    variant: {
      glass: 'glass',
      'glass-strong': 'glass-strong',
      'glass-dark': 'glass-dark',
      'glass-subtle': 'glass-subtle',
      solid: 'bg-[var(--color-surface)] border border-[var(--color-border)] shadow-md',
      elevated: 'bg-[var(--color-surface-elevated)] border border-[var(--color-border)] shadow-lg',
      outlined: 'bg-transparent border-2 border-[var(--color-border)]'
    },
    padding: {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10'
    },
    hover: {
      true: 'hover:shadow-glass-hover hover:border-[var(--glass-border-hover)]',
      false: ''
    },
    interactive: {
      true: 'cursor-pointer pressable',
      false: ''
    }
  },
  defaultVariants: {
    variant: 'glass',
    padding: 'md',
    hover: false,
    interactive: false
  }
});

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants.variants.variant;
  padding?: keyof typeof cardVariants.variants.padding;
  hover?: boolean;
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    variant = 'glass',
    padding = 'md',
    hover = false,
    interactive = false,
    children,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, padding, hover, interactive }),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-h3 font-semibold', className)} {...props}>
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p ref={ref} className={cn('text-body-sm text-[var(--color-muted-foreground)] mt-1', className)} {...props}>
      {children}
    </p>
  )
);

CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('mt-4 flex items-center gap-3', className)} {...props}>
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';