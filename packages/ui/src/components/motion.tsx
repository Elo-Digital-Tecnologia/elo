'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Transição entre rotas: entra subindo e desfocando para nítido. */
export function PageTransition({ children }: { children: ReactNode }) {
  const path = usePathname();
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={path}
        initial={reduce ? false : { opacity: 0, y: 18, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={reduce ? undefined : { opacity: 0, y: -8, filter: 'blur(4px)' }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Lista que entra em cascata. Filhos devem ser <StaggerItem>. */
export function Stagger({ children, className = '', gap = 0.06 }: { children: ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      layout
      variants={{
        hidden: { opacity: 0, y: 22, scale: 0.97 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } },
      }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.25 } }}
    >
      {children}
    </motion.div>
  );
}

export { AnimatePresence, motion };
