// Modal — Liquid glass modal with portal
'use client';

import { forwardRef, Fragment, useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Button } from '../base/Button';
import { useClickOutside, useEscapeKey } from '../../hooks';
import { Text } from '../primitives/Text';

const modalVariants = tv({
  base: 'fixed inset-0 z-[500] flex items-center justify-center p-4',
  variants: {
    open: {
      true: 'opacity-100 pointer-events-auto',
      false: 'opacity-0 pointer-events-none'
    }
  },
  defaultVariants: {
    open: false
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
  base: 'glass-modal relative w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-scale-in-spring',
  variants: {
    size: {
      sm: 'max-w-sm',
      md: 'max-w-lg',
      lg: 'max-w-xl',
      xl: 'max-w-2xl',
      full: 'max-w-[90vw]'
    }
  },
  defaultVariants: {
    size: 'md'
  }
});

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  size?: keyof typeof contentVariants.variants.size;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: ReactNode;
  className?: string;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({
    open,
    onClose,
    title,
    description,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    footer,
    className
  }, ref) => {
    const modalRef = useClickOutside(onClose, closeOnOverlayClick);
    useEscapeKey(onClose, closeOnEscape);

    const contentRef = useCallback((node: HTMLDivElement | null) => {
      if (ref) {
        if (typeof ref === 'function') ref(node);
        else ref.current = node;
      }
      modalRef.current = node;
    }, [ref, modalRef]);

    if (!open) return null;

    const modalContent = (
      <div
        ref={contentRef}
        className={cn(modalVariants({ open }), className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
      >
        <div className={cn(overlayVariants({ open }))} onClick={closeOnOverlayClick ? onClose : undefined} />
        <div className={cn(contentVariants({ size }))}>
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                {title && (
                  <h2 id="modal-title" className="text-h3 font-semibold">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="modal-description" className="text-body-sm text-[var(--color-muted-foreground)] mt-1">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Fechar"
                >
                  <Icon name="x" size="md" aria-hidden="true" />
                </Button>
              )}
            </div>
          )}
          <div className="flex-1 overflow-y-auto pr-2">
            {children}
          </div>
          {footer && (
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--glass-border)] pt-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    );

    if (typeof window === 'undefined') return null;

    return createPortal(modalContent, document.body);
  }
);

Modal.displayName = 'Modal';

// Confirmation modal helper
export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  loading = false
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    />
  );
}