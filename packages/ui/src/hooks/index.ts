// Hooks barrel export (already created)
// useToast lives in ../providers/ToastProvider (it owns the rendered toast
// viewport); this package used to also ship a second, unrendered duplicate.
export { useMediaQuery, useBreakpoint, useMaxBreakpoint, useBreakpointRange, useCurrentBreakpoint, useIsMobile, useIsTablet, useIsDesktop, useIsLargeDesktop, useOrientation, useIsTouch, useCanHover } from './useMediaQuery';
export { useReducedMotion, useAnimationConfig, useSpringConfig, useTransitionDuration, useTransitionStyle } from './useReducedMotion';
export { useLocalStorage, useLocalStorageBoolean, useLocalStorageString, useLocalStorageNumber, useLocalStorageObject, useLocalStorageArray } from './useLocalStorage';
export { useDebounce, useDebouncedCallback, useThrottle, useThrottledCallback } from './useDebounce';
export { useClickOutside, useClickOutsideMultiple, useEscapeKey, useDismissOnInteraction } from './useClickOutside';