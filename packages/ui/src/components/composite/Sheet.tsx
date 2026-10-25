// Sheet — Bottom sheet component for mobile
'use client';

import { forwardRef, Fragment, useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Button } from '../base/Button';
import { useClickOutside, useEscapeKey } from '../../hooks';
import { Text } from '../primitives/Text';

const sheetVariants = tv({
  base: 'fixed inset-0 z-[500] flex flex-col pointer-events-none',
  variants: {
    open: {
      true: 'pointer-events-auto',
      false: 'pointer-events-none'
    },
    side: {
      bottom: 'items-end justify-end',
      top: 'items-start justify-start',
      left: 'items-start justify-start',
      right: 'items-end justify-end'
    }
  },
  defaultVariants: {
    open: false,
    side: 'bottom'
  }
});

const overlayVariants = tv({
  base: 'absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-normal',
  variants: {
    open: {
      true: 'opacity-100',
      false: 'opacity-0'
    }
  },
  defaultVariants: {
    open: false
  }
});

const contentVariants = tv({
  base: 'glass-strong relative w-full max-h-[85vh] flex flex-col overflow-hidden animate-slide-in-bottom animate-ease-out animate-fill-forwards',
  variants: {
    side: {
      bottom: 'rounded-t-2xl border-t border-[var(--glass-border)]',
      top: 'rounded-b-2xl border-b border-[var(--glass-border)]',
      left: 'rounded-r-2xl border-r border-[var(--glass-border)] h-full max-w-[90vw]',
      right: 'rounded-l-2xl border-l border-[var(--glass-border)] h-full max-w-[90vw]'
    },
    size: {
      auto: 'max-h-[50vh]',
      half: 'max-h-[50vh]',
      full: 'max-h-[85vh]',
      '3/4': 'max-h-[75vh]'
    }
  },
  defaultVariants: {
    side: 'bottom',
    size: 'auto'
  }
});

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  side?: keyof typeof sheetVariants.variants.side;
  size?: keyof typeof contentVariants.variants.size;
  showHandle?: boolean;
  showCloseButton?: boolean;
  footer?: ReactNode;
  className?: string;
}

export const Sheet = forwardRef<HTMLDivElement, SheetProps>(
  ({
    open,
    onClose,
    title,
    description,
    children,
    side = 'bottom',
    size = 'auto',
    showHandle = true,
    showCloseButton = true,
    footer,
    className
  }, ref) => {
    const sheetRef = useClickOutside(onClose, true);
    useEscapeKey(onClose, true);

    const contentRef = useCallback((node: HTMLDivElement | null) => {
      if (ref) {
        if (typeof ref === 'function') ref(node);
        else ref.current = node;
      }
      sheetRef.current = node;
    }, [ref, sheetRef]);

    if (!open) return null;

    const sheetContent = (
      <div
        ref={contentRef}
        className={cn(sheetVariants({ open, side }), className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        aria-describedby={description ? 'sheet-description' : undefined}
      >
        <div className={cn(overlayVariants({ open }))} onClick={onClose} />
        <div className={cn(contentVariants({ side, size }))}>
          <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
            <div className="flex-1">
              {showHandle && (
                <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-3" aria-hidden="true" />
              )}
              {title && (
                <h2 id="sheet-title" className="text-h3 font-semibold text-center">
                  {title}
                </h2>
              )}
              {description && (
                <p id="sheet-description" className="text-body-sm text-[var(--color-muted-foreground)] text-center mt-1">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
                <Icon name="x" size="md" aria-hidden="true" />
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
          {footer && (
            <div className="p-4 border-t border-[var(--glass-border)]">
              {footer}
            </div>
          )}
        </div>
      </div>
    );

    if (typeof window === 'undefined') return null;

    return createPortal(sheetContent, document.body);
  }
);

Sheet.displayName = 'Sheet';