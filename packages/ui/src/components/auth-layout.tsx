'use client';

import { m as motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Aurora } from './aurora';
import { Logo } from './logo';
import { ThemeToggle } from './theme';

/** Tela de entrada: fundo e um único cartão com o formulário. */
export function AuthLayout({
  brandSub,
  title,
  children,
}: {
  brandSub: string;
  /** Nome do restaurante, quando a entrada é de um restaurante específico. */
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-10">
      <Aurora />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass glass-strong relative w-full max-w-sm space-y-6 p-7 sm:p-8"
      >
        <div className="space-y-3">
          <Logo sub={brandSub} />
          {title && <h1 className="font-display text-2xl font-bold leading-tight">{title}</h1>}
        </div>
        {children}
      </motion.main>
    </div>
  );
}
