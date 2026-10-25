// Box — Primitive layout component
'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';

const boxVariants = tv({
  base: 'box-border',
  variants: {
    display: {
      block: 'block',
      inline: 'inline',
      flex: 'flex',
      inlineFlex: 'inline-flex',
      grid: 'grid',
      hidden: 'hidden'
    },
    flexDir: {
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
      12: 'gap-12',
      16: 'gap-16'
    },
    padding: {
      none: 'p-0',
      xs: 'p-1',
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
      '2xl': 'p-12'
    },
    margin: {
      none: 'm-0',
      auto: 'm-auto',
      xs: 'm-1',
      sm: 'm-2',
      md: 'm-4',
      lg: 'm-6',
      xl: 'm-8'
    },
    width: {
      full: 'w-full',
      screen: 'w-screen',
      auto: 'w-auto',
      fit: 'w-fit',
      '1/2': 'w-1/2',
      '1/3': 'w-1/3',
      '2/3': 'w-2/3',
      '1/4': 'w-1/4',
      '3/4': 'w-3/4'
    },
    height: {
      full: 'h-full',
      screen: 'h-screen',
      auto: 'h-auto',
      fit: 'h-fit',
      '1/2': 'h-1/2',
      '1/3': 'h-1/3',
      '2/3': 'h-2/3'
    },
    overflow: {
      auto: 'overflow-auto',
      hidden: 'overflow-hidden',
      scroll: 'overflow-scroll',
      visible: 'overflow-visible',
      xAuto: 'overflow-x-auto',
      yAuto: 'overflow-y-auto'
    }
  },
  defaultVariants: {
    display: 'block'
  }
});

export interface BoxProps extends HTMLAttributes<HTMLDivElement> {
  display?: keyof typeof boxVariants.variants.display;
  flexDir?: keyof typeof boxVariants.variants.flexDir;
  align?: keyof typeof boxVariants.variants.align;
  justify?: keyof typeof boxVariants.variants.justify;
  gap?: keyof typeof boxVariants.variants.gap;
  padding?: keyof typeof boxVariants.variants.padding;
  margin?: keyof typeof boxVariants.variants.margin;
  width?: keyof typeof boxVariants.variants.width;
  height?: keyof typeof boxVariants.variants.height;
  overflow?: keyof typeof boxVariants.variants.overflow;
}

export const Box = forwardRef<HTMLDivElement, BoxProps>(
  ({
    className,
    display,
    flexDir,
    align,
    justify,
    gap,
    padding,
    margin,
    width,
    height,
    overflow,
    children,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          boxVariants({
            display,
            flexDir,
            align,
            justify,
            gap,
            padding,
            margin,
            width,
            height,
            overflow
          }),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Box.displayName = 'Box';