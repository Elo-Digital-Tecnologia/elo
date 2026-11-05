let locks = 0;
let previous = { overflow: '', paddingRight: '' };

/** Stops the page from scrolling. Counted, so stacked overlays release it only when the last one closes. */
export function lockScroll() {
    locks += 1;
    if (locks > 1) return;
    const root = document.documentElement;
    previous = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
    const scrollbar = window.innerWidth - root.clientWidth;
    root.style.overflow = 'hidden';
    if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
}

export function unlockScroll() {
    if (locks === 0) return;
    locks -= 1;
    if (locks > 0) return;
    const root = document.documentElement;
    root.style.overflow = previous.overflow;
    root.style.paddingRight = previous.paddingRight;
}
