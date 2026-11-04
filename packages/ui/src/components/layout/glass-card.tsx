import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
    /** Denser glass with a stronger blur: modals, panels, highlights. */
    strong?: boolean;
    /** Sobe e acende a borda no hover. */
    lift?: boolean;
}

/** Liquid glass card. Glowing border, reflection and depth come from .glass (glass.css). */
export function GlassCard({ strong, lift, className = '', ...props }: Props) {
    return (
        <div
            className={`glass ${strong ? 'glass-strong' : ''} ${lift ? 'glass-lift' : ''} ${className}`}
            {...props}
        />
    );
}
