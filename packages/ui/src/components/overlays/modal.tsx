'use client';

import type { ReactNode } from 'react';
import { m as motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useRef } from 'react';
import { useUiTexts } from '../../texts/ui-texts';
import { MOTION_SPRINGS } from '../../theme/motion';
import { AUTOFOCUS_SELECTOR, FINE_POINTER_QUERY } from './overlay-constants';
import { OverlayLayer } from './overlay-layer';

/**
 * Glass modal with a blurred backdrop. Closes with Esc, a click outside or the button.
 * Once open it focuses the `data-autofocus` field, but only with a mouse: on a phone
 * the keyboard would pop up over the form.
 */
export function Modal({
    open,
    onClose,
    title,
    children,
    sheet = false
}: {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    /** On mobile it opens as a bottom sheet. */
    sheet?: boolean;
}) {
    const t = useUiTexts();
    const panel = useRef<HTMLDivElement>(null);

    const focusFirstField = () => {
        const el = panel.current;
        if (!el || el.contains(document.activeElement)) return;
        if (!window.matchMedia(FINE_POINTER_QUERY).matches) return;
        el.querySelector<HTMLElement>(AUTOFOCUS_SELECTOR)?.focus();
    };

    return (
        <OverlayLayer open={open} onClose={onClose}>
            {/* The fade lives on the backdrop: fading a parent of blurred layers makes phones flicker. */}
            <motion.div
                className={`fixed inset-0 z-50 flex justify-center p-4 ${sheet ? 'items-end sm:items-center' : 'items-center'}`}
            >
                <motion.div
                    className="modal-backdrop absolute inset-0 touch-none bg-leaf-900/40 backdrop-blur-md"
                    onClick={onClose}
                    aria-hidden
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                />
                <motion.div
                    ref={panel}
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                    className="glass glass-strong relative max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain p-6 scroll-soft"
                    initial={{ opacity: 0, y: 50, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.96 }}
                    transition={{ ...MOTION_SPRINGS.overlay }}
                    onAnimationComplete={focusFirstField}
                >
                    <div className="mb-4 flex items-start justify-between gap-4">
                        {title && <h2 className="text-xl font-bold">{title}</h2>}
                        <button
                            onClick={onClose}
                            aria-label={t.close}
                            className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-leaf-100/60 transition hover:rotate-90 hover:bg-leaf-200/80"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    {children}
                </motion.div>
            </motion.div>
        </OverlayLayer>
    );
}
