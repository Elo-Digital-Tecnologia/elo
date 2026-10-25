// Heading — Semantic heading component
'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';

const headingVariants = tv({
  base: 'font-display font-semibold',
  variants: {
    level: {
      1: 'text-h1',
      2: 'text-h2',
      3: 'text-h3',
      4: 'text-h4',
      5: 'text-h5',
      6: 'text-h6'
    },
    size: {
      displayXl: 'text-display-xl',
      displayLg: 'text-display-lg',
      displayMd: 'text-display-md',
      displaySm: 'text-display-sm',
      displayXs: 'text-display-xs'
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
      extrabold: 'font-extrabold'
    },
    color: {
      default: 'text-[var(--color-foreground)]',
      muted: 'text-[var(--color-muted-foreground)]',
      primary: 'text-[var(--color-primary)]',
      inverse: 'text-[var(--color-primary-foreground)]'
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right'
    }
  },
  defaultVariants: {
    level: 1,
    weight: 'semibold',
    color: 'default'
  }
});

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: keyof typeof headingVariants.variants.level;
  size?: keyof typeof headingVariants.variants.size;
  weight?: keyof typeof headingVariants.variants.weight;
  color?: keyof typeof headingVariants.variants.color;
  align?: keyof typeof headingVariants.variants.align;
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({
    className,
    level = 1,
    size,
    weight,
    color,
    align,
    children,
    ...props
  }, ref) => {
    const tags = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' } as const;
    const Tag = tags[level ?? 1];
    return (
      <Tag
        ref={ref}
        className={cn(
          headingVariants({ level, size, weight, color, align }),
          className
        )}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);

Heading.displayName = 'Heading';