// Flex — Flexbox layout component
'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';

const flexVariants = tv({
  base: 'flex',
  variants: {
    direction: {
      row: 'flex-row',
      col: 'flex-col',
      rowReverse: 'flex-row-reverse',
      colReverse: 'flex-col-reverse'
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline'
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly'
    },
    gap: {
      0: 'gap-0',
      1: 'gap-1',
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      5: 'gap-5',
      6: 'gap-6',
      8: 'gap-8',
      10: 'gap-10',
      12: 'gap-12'
    },
    wrap: {
      nowrap: 'flex-nowrap',
      wrap: 'flex-wrap',
      wrapReverse: 'flex-wrap-reverse'
    },
    grow: {
      0: 'flex-1',
      1: 'flex-1',
      2: 'flex-[2]',
      3: 'flex-[3]',
      4: 'flex-[4]',
      5: 'flex-[5]'
    },
    shrink: {
      0: 'flex-shrink-0',
      1: 'flex-shrink'
    },
    basis: {
      auto: 'flex-basis-auto',
      full: 'flex-basis-full',
      '1/2': 'flex-basis-1/2',
      '1/3': 'flex-basis-1/3',
      '1/4': 'flex-basis-1/4'
    }
  },
  defaultVariants: {
    direction: 'row',
    align: 'stretch',
    justify: 'start',
    gap: 0,
    wrap: 'nowrap'
  }
});

export interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  direction?: keyof typeof flexVariants.variants.direction;
  align?: keyof typeof flexVariants.variants.align;
  justify?: keyof typeof flexVariants.variants.justify;
  gap?: keyof typeof flexVariants.variants.gap;
  wrap?: keyof typeof flexVariants.variants.wrap;
  grow?: keyof typeof flexVariants.variants.grow;
  shrink?: keyof typeof flexVariants.variants.shrink;
  basis?: keyof typeof flexVariants.variants.basis;
  children: React.ReactNode;
}

export const Flex = forwardRef<HTMLDivElement, FlexProps>(
  ({
    className,
    direction = 'row',
    align = 'stretch',
    justify = 'start',
    gap = 0,
    wrap = 'nowrap',
    grow,
    shrink,
    basis,
    children,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          flexVariants({ direction, align, justify, gap, wrap, grow, shrink, basis }),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Flex.displayName = 'Flex';