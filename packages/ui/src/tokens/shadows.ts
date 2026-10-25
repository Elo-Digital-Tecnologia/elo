// Design System Shadows — Elo Digital
// Inclui sombras liquid glass

export const shadows = {
  // Standard
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  '2xl': '0 50px 100px -20px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

  // Liquid Glass
  glass: '0 8px 32px 0 rgb(0 0 0 / 0.1), inset 0 1px 0 0 rgb(255 255 255 / 0.1)',
  'glass-hover': '0 12px 40px 0 rgb(0 0 0 / 0.12), inset 0 1px 0 0 rgb(255 255 255 / 0.15)',
  'glass-pressed': '0 4px 16px 0 rgb(0 0 0 / 0.1), inset 0 1px 0 0 rgb(255 255 255 / 0.1)',
  'glass-dark': '0 8px 32px 0 rgb(0 0 0 / 0.3), inset 0 1px 0 0 rgb(255 255 255 / 0.05)',
  'glass-dark-hover': '0 12px 40px 0 rgb(0 0 0 / 0.35), inset 0 1px 0 0 rgb(255 255 255 / 0.08)',
  'glass-strong': '0 16px 48px 0 rgb(0 0 0 / 0.15), inset 0 1px 0 0 rgb(255 255 255 / 0.15)',

  // Colored shadows (for primary actions)
  'primary-glow': '0 0 0 1px #15803D, 0 4px 16px 0 rgb(21 128 61 / 0.3)',
  'primary-glow-hover': '0 0 0 1px #15803D, 0 8px 24px 0 rgb(21 128 61 / 0.4)',
  'accent-glow': '0 0 0 1px #D97706, 0 4px 16px 0 rgb(217 119 6 / 0.3)'
} as const;

export type Shadows = typeof shadows;