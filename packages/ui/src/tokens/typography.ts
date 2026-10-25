// Design System Typography — Elo Digital
// Display: Playfair Display SC (elegante, headlines)
// Body: Inter (moderno, legível, UI)
// Mono: JetBrains Mono (código, números)

export const typography = {
  fontFamily: {
    display: ['var(--font-display)', 'serif'],
    body: ['var(--font-body)', 'sans-serif'],
    mono: ['var(--font-mono)', 'monospace']
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem',  // 72px
    '8xl': '6rem',    // 96px
    '9xl': '8rem'     // 128px
  },

  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900'
  },

  lineHeight: {
    none: '1',
    tight: '1.1',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2'
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  },

  // Semantic text styles
  styles: {
    // Display / Headlines
    'display-xl': {
      fontFamily: 'var(--font-display)',
      fontSize: '4.5rem',    // 72px
      fontWeight: '700',
      lineHeight: '1.1',
      letterSpacing: '-0.02em'
    },
    'display-lg': {
      fontFamily: 'var(--font-display)',
      fontSize: '3.75rem',   // 60px
      fontWeight: '700',
      lineHeight: '1.1',
      letterSpacing: '-0.02em'
    },
    'display-md': {
      fontFamily: 'var(--font-display)',
      fontSize: '3rem',      // 48px
      fontWeight: '700',
      lineHeight: '1.15',
      letterSpacing: '-0.01em'
    },
    'display-sm': {
      fontFamily: 'var(--font-display)',
      fontSize: '2.25rem',   // 36px
      fontWeight: '600',
      lineHeight: '1.2',
      letterSpacing: '-0.01em'
    },
    'display-xs': {
      fontFamily: 'var(--font-display)',
      fontSize: '1.875rem',  // 30px
      fontWeight: '600',
      lineHeight: '1.25',
      letterSpacing: '0'
    },

    // Headings
    h1: {
      fontFamily: 'var(--font-display)',
      fontSize: '2.25rem',   // 36px
      fontWeight: '700',
      lineHeight: '1.2',
      letterSpacing: '-0.01em'
    },
    h2: {
      fontFamily: 'var(--font-display)',
      fontSize: '1.875rem',  // 30px
      fontWeight: '600',
      lineHeight: '1.25',
      letterSpacing: '0'
    },
    h3: {
      fontFamily: 'var(--font-display)',
      fontSize: '1.5rem',    // 24px
      fontWeight: '600',
      lineHeight: '1.3',
      letterSpacing: '0'
    },
    h4: {
      fontFamily: 'var(--font-body)',
      fontSize: '1.25rem',   // 20px
      fontWeight: '600',
      lineHeight: '1.4',
      letterSpacing: '0'
    },
    h5: {
      fontFamily: 'var(--font-body)',
      fontSize: '1.125rem',  // 18px
      fontWeight: '600',
      lineHeight: '1.4',
      letterSpacing: '0'
    },
    h6: {
      fontFamily: 'var(--font-body)',
      fontSize: '1rem',      // 16px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0'
    },

    // Body
    'body-lg': {
      fontFamily: 'var(--font-body)',
      fontSize: '1.125rem',  // 18px
      fontWeight: '400',
      lineHeight: '1.625',
      letterSpacing: '0'
    },
    body: {
      fontFamily: 'var(--font-body)',
      fontSize: '1rem',      // 16px
      fontWeight: '400',
      lineHeight: '1.625',
      letterSpacing: '0'
    },
    'body-sm': {
      fontFamily: 'var(--font-body)',
      fontSize: '0.875rem',  // 14px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0'
    },
    'body-xs': {
      fontFamily: 'var(--font-body)',
      fontSize: '0.75rem',   // 12px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0'
    },

    // UI Elements
    label: {
      fontFamily: 'var(--font-body)',
      fontSize: '0.875rem',  // 14px
      fontWeight: '500',
      lineHeight: '1.5',
      letterSpacing: '0'
    },
    'label-sm': {
      fontFamily: 'var(--font-body)',
      fontSize: '0.75rem',   // 12px
      fontWeight: '500',
      lineHeight: '1.5',
      letterSpacing: '0.025em'
    },
    button: {
      fontFamily: 'var(--font-body)',
      fontSize: '0.875rem',  // 14px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0'
    },
    'button-sm': {
      fontFamily: 'var(--font-body)',
      fontSize: '0.75rem',   // 12px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0.025em'
    },
    'button-lg': {
      fontFamily: 'var(--font-body)',
      fontSize: '1rem',      // 16px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0'
    },

    // Data / Mono
    'data-lg': {
      fontFamily: 'var(--font-mono)',
      fontSize: '1rem',      // 16px
      fontWeight: '500',
      lineHeight: '1.5',
      letterSpacing: '0'
    },
    data: {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.875rem',  // 14px
      fontWeight: '500',
      lineHeight: '1.5',
      letterSpacing: '0'
    },
    'data-sm': {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.75rem',   // 12px
      fontWeight: '500',
      lineHeight: '1.5',
      letterSpacing: '0'
    },

    // Caption / Helper
    caption: {
      fontFamily: 'var(--font-body)',
      fontSize: '0.75rem',   // 12px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0.025em'
    },
    overline: {
      fontFamily: 'var(--font-body)',
      fontSize: '0.75rem',   // 12px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const
    },

    // Link
    link: {
      fontFamily: 'var(--font-body)',
      fontSize: '0.875rem',  // 14px
      fontWeight: '500',
      lineHeight: '1.5',
      letterSpacing: '0',
      textDecoration: 'underline',
      textDecorationThickness: '1px',
      textUnderlineOffset: '2px'
    }
  }
} as const;

export type FontFamily = typeof typography.fontFamily;
export type FontSize = typeof typography.fontSize;
export type FontWeight = typeof typography.fontWeight;
export type LineHeight = typeof typography.lineHeight;
export type TextStyle = typeof typography.styles;