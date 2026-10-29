'use client';

import { AnimatePresence, m as motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

/**
 * Janela que sobe da base da tela (centralizada em telas largas).
 * `media` ocupa o topo sem margem (foto do produto); `footer` fica fixo embaixo.
 */
export function Sheet({
  open,
  onClose,
  title,
  media,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  media?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="modal-backdrop absolute inset-0 bg-leaf-900/45" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="sheet relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <button onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-pill bg-black/50 text-white transition hover:bg-black/65">
              <X size={18} />
            </button>
            <div className="scroll-soft min-h-0 flex-1 overflow-y-auto">
              {media}
              <div className="p-5">
                {title && <h2 className="pr-10 text-xl font-bold leading-tight">{title}</h2>}
                {children}
              </div>
            </div>
            {footer && <div className="border-t border-line/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
