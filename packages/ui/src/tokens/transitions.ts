// Design System Transitions — Elo Digital

export const transitions = {
  duration: {
    instant: '0ms',
    fastest: '75ms',
    faster: '100ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '700ms',
    slowestest: '1000ms'
  },

  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  },

  // Semantic transitions
  semantic: {
    // Colors
    color: 'color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    'color-fast': 'color 100ms cubic-bezier(0.4, 0, 0.2, 1)',

    // Background
    background: 'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',

    // Border
    border: 'border-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',

    // Shadow
    shadow: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',

    // Transform
    transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    'transform-fast': 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    'transform-spring': 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',

    // Opacity
    opacity: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    'opacity-fast': 'opacity 100ms cubic-bezier(0.4, 0, 0.2, 1)',

    // All (for simple components)
    all: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    'all-fast': 'all 100ms cubic-bezier(0.4, 0, 0.2, 1)',

    // Liquid Glass specific
    glass: 'backdrop-filter 200ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms cubic-bezier(0.4, 0, 0.2, 1)',

    // Height/Width (for accordions, drawers)
    height: 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    width: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',

    // Focus ring
    focus: 'box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1), outline-offset 150ms cubic-bezier(0.4, 0, 0.2, 1)'
  }
} as const;

export type Transitions = typeof transitions;