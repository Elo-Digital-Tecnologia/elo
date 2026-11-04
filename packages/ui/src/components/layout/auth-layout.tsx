'use client';

import type { ReactNode } from 'react';
import { m as motion } from 'framer-motion';
import { MOTION_DURATIONS, MOTION_EASE } from '../../theme/motion';
import { ThemeToggle } from '../../theme/theme';
import { Logo } from '../brand/logo';
import { Aurora } from '../motion/aurora';

/** Sign-in screen: background and a single card with the form. */
export function AuthLayout({
    brandSub,
    title,
    children
}: {
    brandSub: string;
    /** Restaurant name, when signing in to a specific restaurant. */
    title?: string;
    children: ReactNode;
}) {
    return (
        <div className="relative grid min-h-dvh place-items-center px-4 py-10">
            <Aurora />
            <div className="absolute right-4 top-4 z-10">
                <ThemeToggle />
            </div>
            <motion.main
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: MOTION_DURATIONS.enter, ease: MOTION_EASE }}
                className="glass glass-strong relative w-full max-w-sm space-y-6 p-7 sm:p-8"
            >
                <div className="space-y-3">
                    <Logo sub={brandSub} />
                    {title && (
                        <h1 className="font-display text-2xl font-bold leading-tight">
                            {title}
                        </h1>
                    )}
                </div>
                {children}
            </motion.main>
        </div>
    );
}
