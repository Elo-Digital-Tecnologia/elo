// Design System Breakpoints — Elo Digital
// Mobile-first approach

export const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const;

export const breakpointValues = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

// Media query helpers
export const mediaQueries = {
  xs: `@media (min-width: ${breakpoints.xs})`,
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,

  // Max-width queries
  'max-xs': `@media (max-width: ${String(Number(breakpointValues.xs) - 1)}px)`,
  'max-sm': `@media (max-width: ${String(Number(breakpointValues.sm) - 1)}px)`,
  'max-md': `@media (max-width: ${String(Number(breakpointValues.md) - 1)}px)`,
  'max-lg': `@media (max-width: ${String(Number(breakpointValues.lg) - 1)}px)`,
  'max-xl': `@media (max-width: ${String(Number(breakpointValues.xl) - 1)}px)`,

  // Range queries
  'sm-only': `@media (min-width: ${breakpoints.sm}) and (max-width: ${String(Number(breakpointValues.md) - 1)}px)`,
  'md-only': `@media (min-width: ${breakpoints.md}) and (max-width: ${String(Number(breakpointValues.lg) - 1)}px)`,
  'lg-only': `@media (min-width: ${breakpoints.lg}) and (max-width: ${String(Number(breakpointValues.xl) - 1)}px)`,
  'xl-only': `@media (min-width: ${breakpoints.xl}) and (max-width: ${String(Number(breakpointValues['2xl']) - 1)}px)`,

  // Touch/pointer
  touch: '@media (hover: none) and (pointer: coarse)',
  'no-touch': '@media (hover: hover) and (pointer: fine)',

  // Reduced motion
  'reduce-motion': '@media (prefers-reduced-motion: reduce)',

  // Dark/Light (when not using class strategy)
  dark: '@media (prefers-color-scheme: dark)',
  light: '@media (prefers-color-scheme: light)'
} as const;

export type Breakpoints = typeof breakpoints;
export type MediaQueries = typeof mediaQueries;