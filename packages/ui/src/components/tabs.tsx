'use client';

import type { LucideIcon } from 'lucide-react';
import { useRef } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

/**
 * Pill tabs that split one page into sections. They scroll sideways on narrow
 * screens instead of wrapping, and the arrow keys move between them.
 */
export function Tabs<T extends string>({ items, value, onChange, label }: { items: TabItem<T>[]; value: T; onChange: (id: T) => void; label: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, step: number) => {
    const next = (from + step + items.length) % items.length;
    onChange(items[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div className="-mx-1 max-w-[calc(100%+0.5rem)] overflow-x-auto px-1 py-1 [scrollbar-width:none]">
      <div role="tablist" aria-label={label} className="glass inline-flex !rounded-pill p-1 text-sm font-semibold">
        {items.map((t, i) => {
          const selected = t.id === value;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(t.id)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') move(i, 1);
                else if (e.key === 'ArrowLeft') move(i, -1);
              }}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-pill px-4 py-2 transition ${selected ? 'btn-glass' : 'text-muted hover:text-fg'}`}
            >
              {t.icon && <t.icon size={16} />}
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Content of one tab, tied to its button for screen readers. */
export function TabPanel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} className="mt-5">
      {children}
    </div>
  );
}
