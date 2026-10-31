'use client';

import type { ReactNode } from 'react';
import { Button } from './button';
import { Modal } from './modal';

/** Asks before an action that is hard to undo. The caller keeps the busy and error state. */
export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  loading = false,
  disabled = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  /** Keeps the confirm button off until the fields inside are valid. */
  disabled?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} sheet>
      <div className="space-y-3 text-sm">{children}</div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>Voltar</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={loading} disabled={disabled} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
