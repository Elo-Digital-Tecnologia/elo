'use client';

import { AnimatePresence, m as motion } from 'framer-motion';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sheet } from './sheet';

export interface ActionItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  /** Why the action is off, written under it: touch screens have no tooltips. */
  disabledReason?: string | null;
  hidden?: boolean;
}

const MENU_WIDTH = 256;

function Items({ items, onPick }: { items: ActionItem[]; onPick: (i: ActionItem) => void }) {
  return (
    <ul className="space-y-1" role="menu">
      {items.map((item) => {
        const Icon = item.icon;
        const off = !!item.disabledReason;
        return (
          <li key={item.label} role="none">
            <button
              role="menuitem"
              type="button"
              disabled={off}
              onClick={() => onPick(item)}
              className={`flex w-full items-start gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed ${
                item.danger ? 'text-danger hover:bg-danger/10' : 'hover:bg-brand/10'
              } ${off ? 'opacity-70 hover:bg-transparent' : ''}`}
            >
              {Icon && <Icon size={17} className="mt-0.5 shrink-0" />}
              <span className="min-w-0">
                <span className={`block font-semibold ${off ? 'text-muted' : ''}`}>{item.label}</span>
                {off && <span className="block text-xs font-normal text-muted">{item.disabledReason}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The "⋯" button that keeps rows tidy: secondary actions open in a menu next to
 * the button on wide screens and in a sheet from the bottom on phones.
 */
export function ActionMenu({ items, title, label = 'Mais ações' }: { items: ActionItem[]; title?: string; label?: string }) {
  const visible = items.filter((i) => !i.hidden);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(false);
  const [place, setPlace] = useState<{ top: number; left: number; up: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!open || phone || !trigger.current) return;
    const r = trigger.current.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 80 + visible.length * 56;
    setPlace({ top: up ? r.top - 6 : r.bottom + 6, left: Math.max(8, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)), up });
  }, [open, phone, visible.length]);

  useEffect(() => {
    if (!open || phone) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open, phone]);

  if (!visible.length) return null;
  const pick = (item: ActionItem) => {
    setOpen(false);
    item.onSelect();
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={title ? `${label}: ${title}` : label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setPhone(window.matchMedia('(max-width: 639px)').matches);
          setOpen((o) => !o);
        }}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-fg"
      >
        <MoreHorizontal size={19} />
      </button>
      {/* Rendered at the body: glass cards blur their background, which would trap a fixed menu inside them. */}
      {typeof document !== 'undefined' && phone ? (
        createPortal(
          <Sheet open={open} onClose={() => setOpen(false)} title={title ?? label}>
            <div className="mt-4">
              <Items items={visible} onPick={pick} />
            </div>
          </Sheet>,
          document.body,
        )
      ) : (
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && place && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
                <motion.div
                  className="glass glass-strong fixed z-50 p-2"
                  style={{ top: place.top, left: place.left, width: MENU_WIDTH, translateY: place.up ? '-100%' : 0 }}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                >
                  <Items items={visible} onPick={pick} />
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )
      )}
    </>
  );
}
