// Container — Responsive container component
'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';

const containerVariants = tv({
  base: 'mx-auto w-full px-4',
  variants: {
    size: {
      sm: 'max-w-3xl',      // 480px
      md: 'max-w-5xl',      // 640px
      lg: 'max-w-7xl',      // 1024px
      xl: 'max-w-[1280px]', // 1280px
      '2xl': 'max-w-[1400px]',
      full: 'max-w-full'
    },
    padding: {
      none: 'px-0',
      sm: 'px-3',
      md: 'px-4',
      lg: 'px-6',
      xl: 'px-8'
    }
  },
  defaultVariants: {
    size: 'lg',
    padding: 'md'
  }
});

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: keyof typeof containerVariants.variants.size;
  padding?: keyof typeof containerVariants.variants.padding;
  as?: 'div' | 'main' | 'section' | 'article';
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({
    className,
    size = 'lg',
    padding = 'md',
    as: Component = 'div',
    children,
    ...props
  }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(containerVariants({ size, padding }), className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Container.displayName = 'Container';