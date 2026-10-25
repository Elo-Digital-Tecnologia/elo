// Design System Colors — Elo Digital
// Paleta verde calma/paz para restaurante
// Light/Dark mode support via CSS variables

export const colors = {
  // Primary - Verde Natureza (calmo, confiança)
  primary: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
    DEFAULT: '#15803D',
    foreground: '#FFFFFF'
  },

  // Secondary - Emerald (ação secundária)
  secondary: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
    950: '#022C22',
    DEFAULT: '#059669',
    foreground: '#000000'
  },

  // Accent - Amber (CTAs especiais, avisos suaves)
  accent: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    950: '#451A03',
    DEFAULT: '#D97706',
    foreground: '#000000'
  },

  // Semantic colors (CSS variables)
  semantic: {
    background: 'var(--color-background)',
    foreground: 'var(--color-foreground)',
    surface: 'var(--color-surface)',
    'surface-elevated': 'var(--color-surface-elevated)',
    muted: 'var(--color-muted)',
    'muted-foreground': 'var(--color-muted-foreground)',
    border: 'var(--color-border)',
    ring: 'var(--color-ring)',
    destructive: 'var(--color-destructive)',
    'destructive-foreground': 'var(--color-destructive-foreground)'
  },

  // Liquid Glass
  glass: {
    light: {
      bg: 'rgba(255, 255, 255, 0.1)',
      border: 'rgba(255, 255, 255, 0.15)',
      blur: 'blur(12px)',
      'blur-strong': 'blur(16px)'
    },
    dark: {
      bg: 'rgba(15, 23, 42, 0.3)',
      border: 'rgba(148, 163, 184, 0.1)',
      blur: 'blur(12px)',
      'blur-strong': 'blur(16px)'
    }
  },

  // Status colors
  status: {
    success: '#10B981',
    'success-bg': '#ECFDF5',
    warning: '#F59E0B',
    'warning-bg': '#FFFBEB',
    error: '#EF4444',
    'error-bg': '#FEF2F2',
    info: '#3B82F6',
    'info-bg': '#EFF6FF'
  }
} as const;

export type ColorScale = typeof colors.primary;
export type SemanticColors = typeof colors.semantic;