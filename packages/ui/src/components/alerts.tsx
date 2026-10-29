'use client';

import { AnimatePresence, m as motion } from 'framer-motion';
import { BellRing, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface AlertItem {
  title: string;
  body?: string;
  /** Where tapping the alert goes. */
  href?: string;
  /** Same tag within a short time is shown once. */
  tag?: string;
}

interface Shown extends AlertItem {
  id: number;
}

interface AlertsApi {
  notify: (alert: AlertItem, opts?: { silent?: boolean }) => void;
}

const Ctx = createContext<AlertsApi>({ notify: () => undefined });
export const useAlerts = () => useContext(Ctx);

const VISIBLE_MS = 8000;
const REPEAT_WINDOW_MS = 5000;
const MAX_SHOWN = 3;

let audio: AudioContext | null = null;

/**
 * Browsers only play sound after a tap on the page; call this from one
 * (the "Ativar avisos" button) so later alerts can ring.
 */
export function unlockAlertSound() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audio ??= new Ctor();
    void audio.resume();
  } catch {
    /* no audio on this device */
  }
}

/** Two short rising tones, generated on the fly (no audio file to load). */
function chime() {
  if (!audio || audio.state !== 'running') return;
  const now = audio.currentTime;
  for (const [i, freq] of [880, 1320].entries()) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = now + i * 0.16;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + 0.32);
  }
}

/**
 * Alerts for the staff panels: a banner on top of any page, a chime,
 * a vibration on phones and an unread count in the tab title until the
 * page is looked at again.
 */
export function AlertsProvider({ children, onOpen }: { children: ReactNode; onOpen?: (href: string) => void }) {
  const [shown, setShown] = useState<Shown[]>([]);
  const [unread, setUnread] = useState(0);
  const seq = useRef(0);
  const recent = useRef(new Map<string, number>());
  const baseTitle = useRef<string | null>(null);

  const dismiss = useCallback((id: number) => setShown((s) => s.filter((a) => a.id !== id)), []);

  const notify = useCallback(
    (alert: AlertItem, opts: { silent?: boolean } = {}) => {
      if (alert.tag) {
        const last = recent.current.get(alert.tag);
        if (last && Date.now() - last < REPEAT_WINDOW_MS) return;
        recent.current.set(alert.tag, Date.now());
      }
      const id = ++seq.current;
      setShown((s) => [{ ...alert, id }, ...s].slice(0, MAX_SHOWN));
      setTimeout(() => dismiss(id), VISIBLE_MS);
      if (document.visibilityState === 'hidden' || !document.hasFocus()) setUnread((n) => n + 1);
      if (!opts.silent) {
        chime();
        try {
          navigator.vibrate?.([180, 80, 180]);
        } catch {
          /* vibration not allowed */
        }
      }
    },
    [dismiss],
  );

  useEffect(() => {
    const seen = () => {
      if (document.visibilityState === 'visible') setUnread(0);
    };
    document.addEventListener('visibilitychange', seen);
    window.addEventListener('focus', seen);
    return () => {
      document.removeEventListener('visibilitychange', seen);
      window.removeEventListener('focus', seen);
    };
  }, []);

  useEffect(() => {
    baseTitle.current ??= document.title.replace(/^\(\d+\)\s*/, '');
    const base = document.title.replace(/^\(\d+\)\s*/, '') || baseTitle.current;
    document.title = unread ? `(${unread}) ${base}` : base;
  }, [unread]);

  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="assertive" className="pointer-events-none fixed inset-x-3 top-3 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end">
        <AnimatePresence initial={false}>
          {shown.map((a) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24 }}
              className="glass glass-strong pointer-events-auto flex w-full max-w-sm items-start gap-3 p-3.5"
              role="alert"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-accent text-accent-fg">
                <BellRing size={18} />
              </span>
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  dismiss(a.id);
                  if (a.href) onOpen?.(a.href);
                }}
              >
                <span className="block font-semibold leading-snug">{a.title}</span>
                {a.body && <span className="mt-0.5 block text-sm text-muted">{a.body}</span>}
              </button>
              <button onClick={() => dismiss(a.id)} aria-label="Fechar aviso" className="grid h-8 w-8 shrink-0 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-fg">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
