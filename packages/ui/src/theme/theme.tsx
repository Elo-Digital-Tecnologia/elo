'use client';

import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useUiTexts } from '../texts/ui-texts';
import { THEME_KEY as KEY } from './theme-script';

export type Theme = 'light' | 'dark';

/** Loads the layout animation features on demand, outside the initial JS. */
const loadFeatures = () => import('framer-motion').then((m) => m.domMax);

const Ctx = createContext<{ theme: Theme; toggle: () => void }>({
    theme: 'light',
    toggle: () => {}
});
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light');

    const [lite, setLite] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        setTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
        setLite(root.dataset.lite === '1');

        // Hidden tab: continuous animations pause.
        const onVisibility = () => {
            root.dataset.hidden = document.hidden ? '1' : '';
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    const toggle = useCallback(() => {
        setTheme((cur) => {
            const next: Theme = cur === 'dark' ? 'light' : 'dark';
            document.documentElement.dataset.theme = next;
            try {
                localStorage.setItem(KEY, next);
            } catch {
                /* storage unavailable */
            }
            return next;
        });
    }, []);

    return (
        <Ctx.Provider value={{ theme, toggle }}>
            <MotionConfig reducedMotion={lite ? 'always' : 'user'}>
                <LazyMotion features={loadFeatures}>{children}</LazyMotion>
            </MotionConfig>
        </Ctx.Provider>
    );
}

/** Glass button with an icon that spins on toggle. */
export function ThemeToggle({ className = '' }: { className?: string }) {
    const t = useUiTexts();
    const { theme, toggle } = useTheme();
    const dark = theme === 'dark';
    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={dark ? t.useLightTheme : t.useDarkTheme}
            aria-pressed={dark}
            className={`glass relative grid h-11 w-11 place-items-center !rounded-pill transition active:scale-90 ${className}`}
        >
            <Sun
                size={19}
                className="absolute transition-all duration-500 ease-elo"
                style={{
                    opacity: dark ? 0 : 1,
                    transform: dark ? 'rotate(-90deg) scale(0.4)' : 'none'
                }}
            />
            <Moon
                size={18}
                className="absolute transition-all duration-500 ease-elo"
                style={{
                    opacity: dark ? 1 : 0,
                    transform: dark ? 'none' : 'rotate(90deg) scale(0.4)'
                }}
            />
        </button>
    );
}
