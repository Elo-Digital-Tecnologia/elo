'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'ghost' | 'danger' | 'soft';

const VARIANTS: Record<Variant, string> = {
  primary: 'btn-glass',
  soft: 'glass !rounded-pill text-fg hover:text-brand',
  ghost: 'border border-line/70 bg-bg/30 text-fg backdrop-blur-md hover:bg-leaf-100/60 hover:border-brand/60',
  danger: 'bg-danger text-white shadow-[0_8px_20px_-8px_hsl(var(--elo-danger)/0.7)] hover:brightness-110',
};

interface Props extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  loading?: boolean;
  children?: React.ReactNode;
}

/** Botão pílula com press e, no primário, vidro verde com brilho que varre no hover. */
export function Button({ variant = 'primary', loading, disabled, className = '', children, ...props }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-pill px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </motion.button>
  );
}
