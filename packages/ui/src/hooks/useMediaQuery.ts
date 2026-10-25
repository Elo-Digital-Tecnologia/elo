// useMediaQuery hook — responsive breakpoints
import { useState, useEffect } from 'react';
import { breakpointValues } from '@elo-digital/ui/tokens/breakpoints';

type Breakpoint = keyof typeof breakpointValues;

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${breakpointValues[breakpoint]}px)`);
}

export function useMaxBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(max-width: ${breakpointValues[breakpoint] - 1}px)`);
}

export function useBreakpointRange(
  min: Breakpoint,
  max: Breakpoint
): boolean {
  return useMediaQuery(
    `(min-width: ${breakpointValues[min]}px) and (max-width: ${breakpointValues[max] - 1}px)`
  );
}

// Hook for current breakpoint
export function useCurrentBreakpoint(): Breakpoint | null {
  const [breakpoint, setBreakpoint] = useState<Breakpoint | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateBreakpoint = () => {
      const width = window.innerWidth;
      const breakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

      for (let i = breakpoints.length - 1; i >= 0; i--) {
        if (width >= breakpointValues[breakpoints[i]]) {
          setBreakpoint(breakpoints[i]);
          return;
        }
      }
      setBreakpoint('xs');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}

// Device type hooks
export function useIsMobile(): boolean {
  return useMaxBreakpoint('sm');
}

export function useIsTablet(): boolean {
  return useBreakpointRange('sm', 'lg');
}

export function useIsDesktop(): boolean {
  return useBreakpoint('lg');
}

export function useIsLargeDesktop(): boolean {
  return useBreakpoint('xl');
}

// Orientation
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);

  return orientation;
}

// Touch capability
export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
}

// Hover capability
export function useCanHover(): boolean {
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    setCanHover(mq.matches);

    const handler = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return canHover;
}