// Label — Form label component
'use client';

import { forwardRef, LabelHTMLAttributes } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Text } from '../primitives/Text';

const labelVariants = tv({
  base: 'flex items-center gap-1.5',
  variants: {
    size: {
      sm: 'text-label-sm',
      md: 'text-label',
      lg: 'text-label'
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold'
    },
    color: {
      default: 'text-[var(--color-foreground)]',
      muted: 'text-[var(--color-muted-foreground)]',
      primary: 'text-[var(--color-primary)]',
      destructive: 'text-[var(--color-destructive)]'
    },
    required: {
      true: '',
      false: ''
    }
  },
  defaultVariants: {
    size: 'md',
    weight: 'medium',
    color: 'default',
    required: false
  }
});

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  size?: keyof typeof labelVariants.variants.size;
  weight?: keyof typeof labelVariants.variants.weight;
  color?: keyof typeof labelVariants.variants.color;
  required?: boolean;
  optional?: boolean;
  asterisk?: React.ReactNode;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({
    className,
    size = 'md',
    weight = 'medium',
    color = 'default',
    required = false,
    optional = false,
    asterisk = <span className="text-[var(--color-destructive)]" aria-hidden="true">*</span>,
    children,
    htmlFor,
    ...props
  }, ref) => {
    return (
      <label
        ref={ref}
        htmlFor={htmlFor}
        className={cn(labelVariants({ size, weight, color, required }), className)}
        {...props}
      >
        <Text as="span" weight={weight} color={color}>
          {children}
        </Text>
        {required && <span aria-hidden="true">{asterisk}</span>}
        {optional && (
          <Text as="span" color="muted" size="body-sm">(opcional)</Text>
        )}
      </label>
    );
  }
);

Label.displayName = 'Label';