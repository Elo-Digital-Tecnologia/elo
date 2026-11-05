'use client';

import type { ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isTopOverlay, popOverlay, pushOverlay } from './overlay-stack';
import { lockScroll, unlockScroll } from './scroll-lock';

/**
 * Base of every dialog: rendered at the body (glass cards blur their background, which
 * would trap a fixed dialog inside them), closes with Esc and holds the page still while open.
 */
export function OverlayLayer({
    open,
    onClose,
    children
}: {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
}) {
    const [mounted, setMounted] = useState(false);
    const close = useRef(onClose);
    const id = useId();

    useEffect(() => setMounted(true), []);
    useEffect(() => {
        close.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) =>
            e.key === 'Escape' && isTopOverlay(id) && close.current();
        pushOverlay(id);
        document.addEventListener('keydown', onKey);
        lockScroll();
        return () => {
            popOverlay(id);
            document.removeEventListener('keydown', onKey);
            unlockScroll();
        };
    }, [open, id]);

    if (!mounted) return null;
    return createPortal(
        <AnimatePresence>{open && children}</AnimatePresence>,
        document.body
    );
}
