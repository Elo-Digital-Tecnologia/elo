import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Vidro mais denso e com blur maior: modais, painéis, destaques. */
  strong?: boolean;
  /** Sobe e acende a borda no hover. */
  lift?: boolean;
}

/** Cartão de liquid glass. Borda luminosa, reflexo e profundidade vêm de .glass (glass.css). */
export function GlassCard({ strong, lift, className = '', ...props }: Props) {
  return (
    <div
      className={`glass ${strong ? 'glass-strong' : ''} ${lift ? 'glass-lift' : ''} ${className}`}
      {...props}
    />
  );
}
