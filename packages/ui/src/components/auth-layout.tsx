'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Aurora } from './aurora';
import { Logo } from './logo';
import { ThemeToggle } from './theme';

/** Tela de entrada: aurora, mensagem de marca com vidro flutuante e o formulário ao lado. */
export function AuthLayout({
  brandSub,
  headline,
  lead,
  floating,
  children,
}: {
  brandSub: string;
  headline: string;
  lead: string;
  /** Cartões de vidro decorativos que flutuam ao lado do texto. */
  floating?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-dvh">
      <Aurora />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="relative">
          <Logo sub={brandSub} />
          <motion.h1
            className="mt-8 max-w-xl text-5xl font-extrabold leading-[1.02] sm:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {headline}
          </motion.h1>
          <motion.p
            className="mt-5 max-w-md text-lg text-muted"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            {lead}
          </motion.p>
          {floating && <div className="relative mt-10 hidden h-56 lg:block">{floating}</div>}
        </div>
        <motion.div
          className="glass glass-strong p-7 sm:p-9"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

/** Cartão flutuante decorativo; `delay` desfasa o balanço. */
export function FloatingGlass({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={`glass absolute !rounded-lg p-4 ${className}`}
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      {children}
    </motion.div>
  );
}
