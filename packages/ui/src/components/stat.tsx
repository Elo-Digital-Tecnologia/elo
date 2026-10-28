'use client';

import { animate, useInView, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { GlassCard } from './glass-card';
import { Sparkline } from './charts';

/** Número que sobe até o valor quando entra na tela. */
export function CountUp({ value, format = (n: number) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) return setShown(value);
    const controls = animate(shown, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1], onUpdate: setShown });
    return () => controls.stop();
  }, [value, inView, reduce]);

  return <span ref={ref}>{format(shown)}</span>;
}

/** Cartão de indicador. `trend` desenha a sparkline de apoio. */
export function Stat({
  label,
  value,
  format,
  icon: Icon,
  hint,
  trend,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  icon?: LucideIcon;
  hint?: string;
  trend?: number[];
}) {
  return (
    <GlassCard lift className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{label}</span>
        {Icon && (
          <span className="grid h-9 w-9 place-items-center rounded-pill bg-brand/15 text-brand">
            <Icon size={18} />
          </span>
        )}
      </div>
      <div className="font-display text-4xl font-bold tracking-tight tabular-nums">
        <CountUp value={value} format={format} />
      </div>
      <div className="flex items-end justify-between gap-3">
        {hint && <span className="text-xs text-muted">{hint}</span>}
        {trend && trend.length > 1 && <Sparkline data={trend} className="ml-auto h-8 w-24" />}
      </div>
    </GlassCard>
  );
}
