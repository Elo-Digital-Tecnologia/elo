'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { THEME_KEY as KEY } from './theme-script';

export type Theme = 'light' | 'dark';


const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} });
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);

  const toggle = useCallback(() => {
    setTheme((cur) => {
      const next: Theme = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* storage indisponível */
      }
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

/** Botão de vidro com ícone que gira ao trocar. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
      aria-pressed={dark}
      className={`glass relative grid h-11 w-11 place-items-center !rounded-pill transition active:scale-90 ${className}`}
    >
      <Sun
        size={19}
        className="absolute transition-all duration-500 ease-elo"
        style={{ opacity: dark ? 0 : 1, transform: dark ? 'rotate(-90deg) scale(0.4)' : 'none' }}
      />
      <Moon
        size={18}
        className="absolute transition-all duration-500 ease-elo"
        style={{ opacity: dark ? 1 : 0, transform: dark ? 'none' : 'rotate(90deg) scale(0.4)' }}
      />
    </button>
  );
}
