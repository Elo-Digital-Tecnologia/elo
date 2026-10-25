// Stack — Vertical/horizontal stack with consistent spacing
'use client';

import { forwardRef, Children, isValidElement, HTMLAttributes, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';

const stackVariants = tv({
  base: 'flex',
  variants: {
    direction: {
      vertical: 'flex-col',
      horizontal: 'flex-row'
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
    divider: {
      true: '',
      false: ''
    }
  },
  defaultVariants: {
    direction: 'vertical',
    gap: 4,
    align: 'stretch',
    justify: 'start',
    divider: false
  }
});

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: keyof typeof stackVariants.variants.direction;
  gap?: keyof typeof stackVariants.variants.gap;
  align?: keyof typeof stackVariants.variants.align;
  justify?: keyof typeof stackVariants.variants.justify;
  divider?: boolean | ReactNode;
  children: ReactNode;
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({
    className,
    direction = 'vertical',
    gap = 4,
    align = 'stretch',
    justify = 'start',
    divider = false,
    children,
    ...props
  }, ref) => {
    const childrenArray = Children.toArray(children);
    const validChildren = childrenArray.filter(child => isValidElement(child));

    const childrenWithDividers = divider
      ? validChildren.flatMap((child, index) => [
          child,
          index < validChildren.length - 1 ? (
            <div
              key={`divider-${index}`}
              className={cn(
                'flex-shrink-0 bg-[var(--color-border)]',
                direction === 'vertical' ? 'w-full h-px' : 'w-px h-full'
              )}
              role="separator"
            />
          ) : null
        ])
      : validChildren;

    return (
      <div
        ref={ref}
        className={cn(stackVariants({ direction, gap, align, justify, divider: !!divider }), className)}
        {...props}
      >
        {childrenWithDividers}
      </div>
    );
  }
);

Stack.displayName = 'Stack';

// HStack - Horizontal stack shorthand
export interface HStackProps extends Omit<StackProps, 'direction'> {}

export const HStack = forwardRef<HTMLDivElement, HStackProps>(
  ({ className, ...props }, ref) => (
    <Stack ref={ref} direction="horizontal" className={className} {...props} />
  )
);

HStack.displayName = 'HStack';

// VStack - Vertical stack shorthand
export interface VStackProps extends Omit<StackProps, 'direction'> {}

export const VStack = forwardRef<HTMLDivElement, VStackProps>(
  ({ className, ...props }, ref) => (
    <Stack ref={ref} direction="vertical" className={className} {...props} />
  )
);

VStack.displayName = 'VStack';