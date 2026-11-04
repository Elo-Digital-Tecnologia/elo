'use client';

import type { LucideIcon } from 'lucide-react';
import { animate, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { MOTION_DURATIONS, MOTION_EASE } from '../../theme/motion';
import { GlassCard } from '../layout/glass-card';
import { Sparkline } from './charts';

/** Number that counts up to the value when it enters the screen. */
export function CountUp({
    value,
    format = (n: number) => String(Math.round(n))
}: {
    value: number;
    format?: (n: number) => string;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true });
    const reduce = useReducedMotion();
    const [shown, setShown] = useState(reduce ? value : 0);

    useEffect(() => {
        if (!inView) return;
        if (reduce) return setShown(value);
        const controls = animate(shown, value, {
            duration: MOTION_DURATIONS.count,
            ease: MOTION_EASE,
            onUpdate: setShown
        });
        return () => controls.stop();
    }, [value, inView, reduce]);

    return <span ref={ref}>{format(shown)}</span>;
}

/** Indicator card. `trend` draws the supporting sparkline. */
export function Stat({
    label,
    value,
    format,
    icon: Icon,
    hint,
    trend
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
            <div className="flex items-center justify-between gap-2 text-sm text-muted">
                <span className="min-w-0">{label}</span>
                {Icon && (
                    <span className="grid shrink-0 h-9 w-9 place-items-center rounded-pill bg-brand/15 text-brand">
                        <Icon size={18} />
                    </span>
                )}
            </div>
            <div className="break-words font-display text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
                <CountUp value={value} format={format} />
            </div>
            <div className="flex items-end justify-between gap-3">
                {hint && <span className="min-w-0 text-xs text-muted">{hint}</span>}
                {trend && trend.length > 1 && (
                    <Sparkline data={trend} className="ml-auto h-8 w-20 shrink-0" />
                )}
            </div>
        </GlassCard>
    );
}
