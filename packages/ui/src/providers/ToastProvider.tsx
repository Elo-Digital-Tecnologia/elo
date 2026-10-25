// ToastProvider — Toast notifications with liquid glass styling
'use client';

import { createContext, useContext, useState, useCallback, ReactNode, ReactElement } from 'react';
import { cn } from '@elo-digital/ui/utils/classnames';

export type ToastType = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  action?: ReactNode;
  duration?: number;
  dismissible?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 300;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((newToast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toastWithId = { ...newToast, id };

    setToasts(prev => {
      const updated = [...prev, toastWithId];
      // Limit number of toasts
      return updated.slice(-TOAST_LIMIT);
    });

    // Auto dismiss
    if (newToast.duration !== 0 && newToast.dismissible !== false) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, newToast.duration ?? 5000);
    }

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, dismissAll }}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Toast viewport component
function ToastViewport() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[800] flex flex-col gap-2',
        'pointer-events-none'
      )}
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

// Individual toast item
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const typeStyles = {
    default: 'glass',
    success: 'glass-primary',
    warning: 'glass-accent',
    error: 'glass-destructive',
    info: 'glass'
  };

  const iconStyles = {
    default: 'text-[var(--color-muted-foreground)]',
    success: 'text-[var(--color-primary)]',
    warning: 'text-[var(--color-accent)]',
    error: 'text-[var(--color-destructive)]',
    info: 'text-[var(--color-primary)]'
  };

  const icons: Record<ToastType, ReactElement> = {
    default: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    success: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    warning: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    error: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    info: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  };

  return (
    <div
      className={cn(
        'glass-strong rounded-lg p-4 min-w-[280px] max-w-[420px]',
        'flex items-start gap-3 pointer-events-auto',
        'animate-slide-in-right animate-ease-spring animate-fill-forwards',
        typeStyles[toast.type]
      )}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className={cn('flex-shrink-0 mt-0.5', iconStyles[toast.type])}>
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-h6 font-semibold text-[var(--glass-text)]">
          {toast.title}
        </p>
        {toast.description && (
          <p className="mt-1 text-body-sm text-[var(--glass-text-muted)]">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <div className="mt-3">
            {toast.action}
          </div>
        )}
      </div>
      {toast.dismissible !== false && (
        <button
          onClick={() => onDismiss(toast.id)}
          className={cn(
            'flex-shrink-0 p-1 rounded-md',
            'hover:bg-[var(--glass-bg-hover)]',
            'text-[var(--glass-text-muted)]',
            'transition-colors duration-fast'
          )}
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Helper functions
export const toastHelpers = {
  success: (title: string, description?: string, options?: Partial<Toast>) =>
    ({ type: 'success' as const, title, description, ...options }),
  error: (title: string, description?: string, options?: Partial<Toast>) =>
    ({ type: 'error' as const, title, description, ...options }),
  warning: (title: string, description?: string, options?: Partial<Toast>) =>
    ({ type: 'warning' as const, title, description, ...options }),
  info: (title: string, description?: string, options?: Partial<Toast>) =>
    ({ type: 'info' as const, title, description, ...options }),
  default: (title: string, description?: string, options?: Partial<Toast>) =>
    ({ type: 'default' as const, title, description, ...options })
};