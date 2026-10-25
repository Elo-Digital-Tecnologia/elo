// Toast — Toast notification component (used by ToastProvider)
'use client';

import { forwardRef, HTMLAttributes, useEffect, useState } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Text } from '../primitives/Text';

const toastVariants = tv({
  base: 'glass-strong rounded-lg p-4 min-w-[280px] max-w-[420px] flex items-start gap-3 pointer-events-auto animate-slide-in-right animate-ease-spring animate-fill-forwards',
  variants: {
    type: {
      default: 'glass',
      success: 'glass-primary',
      warning: 'glass-accent',
      error: 'glass-destructive',
      info: 'glass'
    }
  },
  defaultVariants: {
    type: 'default'
  }
});

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  type: 'default' | 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
  action?: React.ReactNode;
  onClose: () => void;
  duration?: number;
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  ({
    className,
    type = 'default',
    title,
    description,
    action,
    onClose,
    duration = 5000,
    ...props
  }, ref) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
      if (duration > 0) {
        const timer = setTimeout(() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }, duration);
        return () => clearTimeout(timer);
      }
    }, [duration, onClose]);

    if (!visible) return null;

    const icons = {
      default: <Icon name="info" size="md" className="text-[var(--color-muted-foreground)]" aria-hidden="true" />,
      success: <Icon name="checkCircle" size="md" className="text-[var(--color-primary)]" aria-hidden="true" />,
      warning: <Icon name="alertTriangle" size="md" className="text-[var(--color-accent)]" aria-hidden="true" />,
      error: <Icon name="alertCircle" size="md" className="text-[var(--color-destructive)]" aria-hidden="true" />,
      info: <Icon name="info" size="md" className="text-[var(--color-primary)]" aria-hidden="true" />
    };

    const iconColors = {
      default: 'text-[var(--color-muted-foreground)]',
      success: 'text-[var(--color-primary)]',
      warning: 'text-[var(--color-accent)]',
      error: 'text-[var(--color-destructive)]',
      info: 'text-[var(--color-primary)]'
    };

    return (
      <div
        ref={ref}
        className={cn(toastVariants({ type }), className)}
        role="alert"
        aria-live={type === 'error' ? 'assertive' : 'polite'}
        {...props}
      >
        <div className={cn('flex-shrink-0 mt-0.5', iconColors[type])}>
          {icons[type]}
        </div>
        <div className="flex-1 min-w-0">
          <Text as="p" weight="semibold" size="body-sm" color="default">
            {title}
          </Text>
          {description && (
            <Text as="p" color="muted" size="body-sm" className="mt-1">
              {description}
            </Text>
          )}
          {action && (
            <div className="mt-3">
              {action}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className={cn(
            'flex-shrink-0 p-1 rounded-md',
            'hover:bg-[var(--glass-bg-hover)]',
            'text-[var(--color-muted-foreground)]',
            'transition-colors duration-fast'
          )}
          aria-label="Fechar notificação"
        >
          <Icon name="x" size="sm" strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    );
  }
);

Toast.displayName = 'Toast';