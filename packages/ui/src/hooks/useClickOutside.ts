// useClickOutside hook — detect clicks outside an element
import { useEffect, useRef, useCallback, MutableRefObject } from 'react';

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  onClickOutside: () => void,
  enabled: boolean = true
): MutableRefObject<T | null> {
  const ref = useRef<T>(null);

  const handleClickOutside = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!enabled || !ref.current) return;

      const target = event.target as Node;
      if (!ref.current.contains(target)) {
        onClickOutside();
      }
    },
    [enabled, onClickOutside]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [enabled, handleClickOutside]);

  return ref;
}

// Variant for multiple refs
export function useClickOutsideMultiple(
  refs: React.RefObject<HTMLElement>[],
  onClickOutside: () => void,
  enabled: boolean = true
) {
  const handleClickOutside = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!enabled) return;

      const target = event.target as Node;
      const clickedInside = refs.some(ref => ref.current?.contains(target));

      if (!clickedInside) {
        onClickOutside();
      }
    },
    [enabled, onClickOutside, refs]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [enabled, handleClickOutside]);
}

// Hook for focus management (close on Escape key)
export function useEscapeKey(
  onEscape: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onEscape]);
}

// Combined: click outside + escape key
export function useDismissOnInteraction(
  onDismiss: () => void,
  enabled: boolean = true
) {
  const ref = useClickOutside(onDismiss, enabled);
  useEscapeKey(onDismiss, enabled);
  return ref;
}