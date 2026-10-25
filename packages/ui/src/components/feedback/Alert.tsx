// Alert — Alert/notification component
'use client';

import { forwardRef, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Button } from '../base/Button';
import { Text } from '../primitives/Text';

const alertVariants = tv({
  base: 'glass relative flex items-start gap-3 rounded-lg',
  variants: {
    variant: {
      default: 'glass',
      success: 'glass-primary',
      warning: 'glass-accent',
      error: 'glass-destructive',
      info: 'glass'
    },
    size: {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6'
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'md'
  }
});

const iconMap = {
  default: 'info',
  success: 'checkCircle',
  warning: 'alertTriangle',
  error: 'alertCircle',
  info: 'info'
} as const;

const iconColors = {
  default: 'text-[var(--color-muted-foreground)]',
  success: 'text-[var(--color-primary)]',
  warning: 'text-[var(--color-accent)]',
  error: 'text-[var(--color-destructive)]',
  info: 'text-[var(--color-primary)]'
} as const;

export interface AlertProps {
  title?: string;
  description?: ReactNode;
  variant?: keyof typeof alertVariants.variants.variant;
  size?: keyof typeof alertVariants.variants.size;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({
    className,
    title,
    description,
    variant = 'default',
    size = 'md',
    dismissible = false,
    onDismiss,
    action,
    children
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(alertVariants({ variant, size }), className)}
        role="alert"
        aria-live={variant === 'error' ? 'assertive' : 'polite'}
      >
        <div className={cn('flex-shrink-0 mt-0.5', iconColors[variant])}>
          <Icon name={iconMap[variant]} size="md" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <Text as="h4" weight="semibold" className="mb-1">
              {title}
            </Text>
          )}
          {(description || children) && (
            <div className="text-body-sm text-[var(--glass-text-muted)]">
              {description}
              {children}
            </div>
          )}
          {action && (
            <div className="mt-3">{action}</div>
          )}
        </div>
        {dismissible && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDismiss}
            aria-label="Fechar alerta"
            className="flex-shrink-0"
          >
            <Icon name="x" size="sm" strokeWidth={2.5} aria-hidden="true" />
          </Button>
        )}
      </div>
    )
  }
);

Alert.displayName = 'Alert';

// Toast-style alert (for inline use)
export interface InlineAlertProps extends Omit<AlertProps, 'dismissible' | 'onDismiss'> {}

export function InlineAlert({ variant = 'default', size = 'md', className, ...props }: InlineAlertProps) {
  return <Alert variant={variant} size={size} className={className} {...props} />;
}