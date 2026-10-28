'use client';

import { AnimatePresence, m as motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

/** Modal de vidro com fundo desfocado. Fecha com Esc, clique fora ou o botão. */
export function Modal({
  open,
  onClose,
  title,
  children,
  sheet = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** No mobile abre como bottom sheet. */
  sheet?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-50 flex justify-center p-4 ${sheet ? 'items-end sm:items-center' : 'items-center'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="modal-backdrop absolute inset-0 bg-leaf-900/40 backdrop-blur-md"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="glass glass-strong relative max-h-[90dvh] w-full max-w-lg overflow-y-auto p-6 scroll-soft"
            initial={{ opacity: 0, y: 50, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              {title && <h2 className="text-xl font-bold">{title}</h2>}
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-leaf-100/60 transition hover:rotate-90 hover:bg-leaf-200/80"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
