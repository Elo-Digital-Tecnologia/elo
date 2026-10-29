'use client';

import { ShoppingBag } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatBRL } from '@elo/core';
import { motion } from '@elo/ui';

/** Barra da sacola presa à base: resumo à esquerda, uma única ação à direita. */
export function CartBar({ count, totalCents, onOpen, action }: { count: number; totalCents: number; onOpen: () => void; action?: ReactNode }) {
  return (
    <motion.div initial={{ y: 90 }} animate={{ y: 0 }} exit={{ y: 90 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="btn-glass pointer-events-auto mx-auto flex max-w-2xl items-center gap-2 rounded-[22px] p-2 pl-2">
        <button type="button" onClick={onOpen} aria-label="Ver a sacola" className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-1.5 text-left">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-white/20">
            <ShoppingBag size={20} />
            <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-pill bg-accent px-1 text-xs font-bold text-accent-fg">{count}</span>
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-xs opacity-85">Ver sacola</span>
            <span className="block font-display text-lg font-bold tabular-nums">{formatBRL(totalCents)}</span>
          </span>
        </button>
        {action}
      </div>
    </motion.div>
  );
}
