// Text — Primitive text component with design system styles
'use client';

import { forwardRef, HTMLAttributes, ElementType } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';

const textVariants = tv({
  base: '',
  variants: {
    size: {
      h1: 'text-h1',
      h2: 'text-h2',
      h3: 'text-h3',
      h4: 'text-h4',
      h5: 'text-h5',
      h6: 'text-h6',
      label: 'text-label',
      'label-sm': 'text-label-sm',
      button: 'text-button',
      'button-sm': 'text-button-sm',
      'button-lg': 'text-button-lg',
      body: 'text-body',
      'body-lg': 'text-body-lg',
      'body-sm': 'text-body-sm',
      'body-xs': 'text-body-xs',
      data: 'text-data',
      'data-lg': 'text-data-lg',
      'data-sm': 'text-data-sm',
      caption: 'text-caption',
      overline: 'text-overline',
      link: 'text-link'
    },
    weight: {
      thin: 'font-thin',
      extralight: 'font-extralight',
      light: 'font-light',
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
      extrabold: 'font-extrabold',
      black: 'font-black'
    },
    color: {
      default: 'text-[var(--color-foreground)]',
      muted: 'text-[var(--color-muted-foreground)]',
      primary: 'text-[var(--color-primary)]',
      secondary: 'text-[var(--color-secondary)]',
      accent: 'text-[var(--color-accent)]',
      destructive: 'text-[var(--color-destructive)]',
      success: 'text-[var(--color-status-success)]',
      warning: 'text-[var(--color-status-warning)]',
      inverse: 'text-[var(--color-primary-foreground)]',
      inherit: 'text-inherit'
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify'
    },
    decoration: {
      none: 'no-underline',
      underline: 'underline',
      lineThrough: 'line-through'
    },
    transform: {
      none: 'normal-case',
      uppercase: 'uppercase',
      lowercase: 'lowercase',
      capitalize: 'capitalize'
    },
    truncate: {
      true: 'truncate',
      false: ''
    },
    wrap: {
      normal: 'whitespace-normal',
      nowrap: 'whitespace-nowrap',
      pre: 'whitespace-pre',
      preLine: 'whitespace-pre-line',
      preWrap: 'whitespace-pre-wrap'
    }
  },
  defaultVariants: {
    size: 'body',
    color: 'default'
  },
  compoundVariants: [
    {
      size: 'h1',
      weight: 'bold',
      className: 'font-display'
    },
    {
      size: 'h2',
      weight: 'semibold',
      className: 'font-display'
    },
    {
      size: 'h3',
      weight: 'semibold',
      className: 'font-display'
    }
  ]
});

// Valid DOM tags Text can render as. Kept separate from the typography
// scale (`size`) so a style like "body-lg" never ends up as a tag name.
export type TextTag = 'p' | 'span' | 'div' | 'label' | 'strong' | 'em' | 'small' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: TextTag;
  size?: keyof typeof textVariants.variants.size;
  weight?: keyof typeof textVariants.variants.weight;
  color?: keyof typeof textVariants.variants.color;
  align?: keyof typeof textVariants.variants.align;
  decoration?: keyof typeof textVariants.variants.decoration;
  transform?: keyof typeof textVariants.variants.transform;
  // tailwind-variants treats the `true`/`false` variant keys as a boolean
  // variant at runtime, so the prop itself must stay `boolean`, not the
  // string-literal keys `keyof typeof ...truncate` would otherwise give.
  truncate?: boolean;
  wrap?: keyof typeof textVariants.variants.wrap;
}

export const Text = forwardRef<HTMLElement, TextProps>(
  ({
    className,
    as = 'p',
    size,
    weight,
    color,
    align,
    decoration,
    transform,
    truncate,
    wrap,
    children,
    ...props
  }, ref) => {
    const Component = as as ElementType;

    return (
      <Component
        ref={ref}
        className={cn(
          textVariants({
            size,
            weight,
            color,
            align,
            decoration,
            transform,
            truncate,
            wrap
          }),
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Text.displayName = 'Text';
