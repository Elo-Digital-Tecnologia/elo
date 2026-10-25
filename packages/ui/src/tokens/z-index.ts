// Design System Z-Index — Elo Digital
// Camadas organizadas para evitar conflitos

export const zIndex = {
  // Base layers
  auto: 'auto',
  0: '0',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',

  // Component layers
  dropdown: '100',        // Dropdown menus
  sticky: '200',          // Sticky headers, navbars
  fixed: '300',           // Fixed elements (bottom nav, FAB)
  overlay: '400',         // Overlay backgrounds
  modal: '500',           // Modals, dialogs
  popover: '600',         // Popovers, tooltips
  tooltip: '700',         // Tooltips
  toast: '800',           // Toast notifications
  loader: '900',          // Full-screen loaders

  // Special
  max: '9999'
} as const;

// Semantic z-index mapping
export const semanticZIndex = {
  // Navigation
  navbar: zIndex.sticky,
  sidebar: zIndex.fixed,
  'mobile-nav': zIndex.fixed,

  // Overlays
  backdrop: zIndex.overlay,
  drawer: zIndex.modal,
  sheet: zIndex.modal,

  // Dialogs
  dialog: zIndex.modal,
  'dialog-nested': '550',
  alert: zIndex.modal,

  // Popups
  popover: zIndex.popover,
  dropdown: zIndex.dropdown,
  'dropdown-nested': '150',
  tooltip: zIndex.tooltip,
  toast: zIndex.toast,

  // Inputs
  select: zIndex.dropdown,
  autocomplete: zIndex.dropdown,
  datepicker: zIndex.dropdown,

  // Feedback
  notification: zIndex.toast,
  'notification-stack': zIndex.toast,

  // Loading
  spinner: zIndex.loader,
  skeleton: '1'
} as const;

export type ZIndex = typeof zIndex;
export type SemanticZIndex = typeof semanticZIndex;