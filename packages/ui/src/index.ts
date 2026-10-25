// @elo-digital/ui — Design System Main Export
// Styles are consumed directly by apps via `@elo-digital/ui/styles/*.css`
// (CSS @import), not re-exported here — CSS files have no JS module shape.

// Tokens
export * from './tokens';

// Components
export * from './components';

// Hooks
export * from './hooks';

// Providers
export * from './providers';

// Utils
export * from './utils';

// Types
export type { ColorScale, SemanticColors } from './tokens/colors';
export type { SpacingScale, SemanticSpacing } from './tokens/spacing';
export type { FontFamily, FontSize, FontWeight, LineHeight, TextStyle } from './tokens/typography';
export type { Shadows } from './tokens/shadows';
export type { BorderRadius, SemanticRadius } from './tokens/border-radius';
export type { Transitions } from './tokens/transitions';
export type { Breakpoints, MediaQueries } from './tokens/breakpoints';
export type { ZIndex, SemanticZIndex } from './tokens/z-index';