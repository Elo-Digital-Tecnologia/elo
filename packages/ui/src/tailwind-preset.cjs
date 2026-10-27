/** Preset Tailwind: só mapeia tokens de theme.css. Nenhum valor de cor solto aqui. */
const c = (v) => `hsl(var(${v}) / <alpha-value>)`;
const leaf = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => [n, c(`--elo-leaf-${n}`)]),
);

module.exports = {
  theme: {
    extend: {
      colors: {
        bg: c('--elo-bg'),
        'bg-soft': c('--elo-bg-soft'),
        fg: c('--elo-fg'),
        muted: c('--elo-fg-muted'),
        line: c('--elo-line'),
        leaf,
        brand: c('--elo-brand'),
        'brand-hover': c('--elo-brand-hover'),
        'brand-fg': c('--elo-brand-fg'),
        accent: c('--elo-accent'),
        'accent-fg': c('--elo-accent-fg'),
        lime: c('--elo-lime'),
        mint: c('--elo-mint'),
        teal: c('--elo-teal'),
        sun: c('--elo-sun'),
        success: c('--elo-success'),
        warning: c('--elo-warning'),
        danger: c('--elo-danger'),
        info: c('--elo-info'),
      },
      borderRadius: {
        sm: 'var(--elo-radius-sm)',
        md: 'var(--elo-radius-md)',
        lg: 'var(--elo-radius-lg)',
        xl: 'var(--elo-radius-xl)',
        pill: 'var(--elo-radius-pill)',
      },
      fontFamily: { sans: 'var(--elo-font-sans)', display: 'var(--elo-font-display)' },
      transitionTimingFunction: { elo: 'var(--elo-ease)' },
    },
  },
};
