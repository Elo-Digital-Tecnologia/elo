// Grid — Responsive grid layout component
'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';

const gridVariants = tv({
  base: 'grid',
  variants: {
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
      6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
      auto: 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))]',
      'auto-sm': 'grid-cols-[repeat(auto-fit,minmax(150px,1fr))]',
      'auto-lg': 'grid-cols-[repeat(auto-fit,minmax(300px,1fr))]'
    },
    gap: {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
      '2xl': 'gap-12'
    },
    rows: {
      auto: 'grid-rows-auto',
      1: 'grid-rows-1',
      2: 'grid-rows-2',
      3: 'grid-rows-3',
      4: 'grid-rows-4'
    },
    flow: {
      row: 'grid-flow-row',
      col: 'grid-flow-col',
      dense: 'grid-flow-dense',
      'row-dense': 'grid-flow-row-dense',
      'col-dense': 'grid-flow-col-dense'
    }
  },
  defaultVariants: {
    cols: 1,
    gap: 'md',
    rows: 'auto',
    flow: 'row'
  }
});

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: keyof typeof gridVariants.variants.cols;
  gap?: keyof typeof gridVariants.variants.gap;
  rows?: keyof typeof gridVariants.variants.rows;
  flow?: keyof typeof gridVariants.variants.flow;
  children: React.ReactNode;
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({
    className,
    cols = 1,
    gap = 'md',
    rows = 'auto',
    flow = 'row',
    children,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(gridVariants({ cols, gap, rows, flow }), className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';