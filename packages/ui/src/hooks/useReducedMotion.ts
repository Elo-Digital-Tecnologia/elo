// useReducedMotion hook — respects user's motion preferences
import { useState, useEffect } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

export function useAnimationConfig<T>(
  normal: T,
  reduced: T
): T {
  const prefersReduced = useReducedMotion();
  return prefersReduced ? reduced : normal;
}

// Spring config for Framer Motion / similar
export function useSpringConfig(
  normal: { stiffness: number; damping: number; mass?: number },
  reduced: { stiffness: number; damping: number; mass?: number } = { stiffness: 1000, damping: 1000 }
) {
  const prefersReduced = useReducedMotion();
  return prefersReduced ? reduced : normal;
}

// Transition duration helper
export function useTransitionDuration(
  normal: number,
  reduced: number = 0
): number {
  const prefersReduced = useReducedMotion();
  return prefersReduced ? reduced : normal;
}

// For CSS transitions
export function useTransitionStyle(
  normal: React.CSSProperties['transition'],
  reduced: React.CSSProperties['transition'] = 'none'
): React.CSSProperties['transition'] {
  const prefersReduced = useReducedMotion();
  return prefersReduced ? reduced : normal;
}