// Design System Border Radius — Elo Digital

export const borderRadius = {
  none: '0',
  xs: '0.125rem',   // 2px
  sm: '0.25rem',    // 4px
  DEFAULT: '0.375rem', // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  '3xl': '2rem',    // 32px
  full: '9999px'
} as const;

// Semantic radius
export const semanticRadius = {
  // Buttons
  button: '0.5rem',       // md
  'button-sm': '0.375rem', // DEFAULT
  'button-lg': '0.75rem',  // lg

  // Inputs
  input: '0.5rem',        // md
  'input-sm': '0.375rem', // DEFAULT

  // Cards
  card: '0.75rem',        // lg
  'card-lg': '1rem',      // xl
  'card-sm': '0.5rem',    // md

  // Modals/Dialogs
  modal: '1rem',          // xl
  popover: '0.75rem',     // lg
  dropdown: '0.5rem',     // md

  // Badges/Chips
  badge: '9999px',        // full
  chip: '0.5rem'          // md
} as const;

export type BorderRadius = typeof borderRadius;
export type SemanticRadius = typeof semanticRadius;