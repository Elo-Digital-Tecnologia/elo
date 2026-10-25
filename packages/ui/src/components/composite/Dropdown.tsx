// Dropdown — Dropdown menu component
'use client';

import { forwardRef, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { useClickOutside } from '../../hooks';

const dropdownVariants = tv({
  base: 'relative inline-block',
  variants: {
    open: {
      true: '',
      false: ''
    }
  },
  defaultVariants: {
    open: false
  }
});

const menuVariants = tv({
  base: 'glass-strong rounded-lg py-1.5 min-w-[180px] max-w-[320px] shadow-glass-strong animate-fade-in-down animate-ease-out animate-fill-forwards',
  variants: {
    side: {
      top: 'bottom-full mb-2',
      bottom: 'top-full mt-2',
      left: 'right-full mr-2',
      right: 'left-full ml-2'
    },
    align: {
      start: '',
      center: '',
      end: ''
    }
  },
  defaultVariants: {
    side: 'bottom',
    align: 'start'
  }
});

export interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: keyof typeof Icons;
  disabled?: boolean;
  dangerous?: boolean;
  shortcut?: string;
}

export type DropdownTriggerRenderProps = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

export interface DropdownProps {
  trigger: ReactNode | ((props: DropdownTriggerRenderProps) => ReactNode);
  items: DropdownItem[];
  side?: keyof typeof menuVariants.variants.side;
  align?: keyof typeof menuVariants.variants.align;
  closeOnClick?: boolean;
  className?: string;
}

export function Dropdown({
  trigger,
  items,
  side = 'bottom',
  align = 'start',
  closeOnClick = true,
  className
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useClickOutside<HTMLDivElement>(() => setOpen(false), open);

  const toggle = useCallback(() => setOpen(prev => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    const enabledItems = items.filter(item => !item.disabled);
    const currentIndex = enabledItems.findIndex(item => item.label === e.currentTarget.textContent?.trim());

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        break;
      case 'ArrowUp':
        e.preventDefault();
        break;
      case 'Escape':
        close();
        break;
      case 'Tab':
        close();
        break;
    }
  };

  if (!open) {
    return (
      <div ref={dropdownRef} className={cn(dropdownVariants({ open }), className)}>
        {typeof trigger === 'function' ? trigger({ open, toggle, close }) : trigger}
      </div>
    );
  }

  const menuContent = (
    <div
      ref={menuRef}
      className={cn(menuVariants({ side, align }))}
      role="menu"
      aria-orientation="vertical"
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => (
        <button
          key={index}
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              if (closeOnClick) close();
            }
          }}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-body-sm transition-colors duration-fast',
            'hover:bg-[var(--glass-bg-hover)]',
            item.disabled && 'opacity-50 cursor-not-allowed',
            item.dangerous && 'text-[var(--color-destructive)]',
            'focus-visible:outline-none focus-visible:bg-[var(--glass-bg-hover)]'
          )}
          tabIndex={-1}
        >
          {item.icon && <Icon name={item.icon} size="sm" aria-hidden="true" />}
          <span className="flex-1 text-left">{item.label}</span>
          {item.shortcut && (
            <kbd className="text-body-xs text-[var(--color-muted-foreground)] px-1.5 py-0.5 rounded bg-[var(--color-muted)] font-mono">
              {item.shortcut}
            </kbd>
          )}
        </button>
      ))}
    </div>
  );

  if (typeof window === 'undefined') {
    return (
      <div ref={dropdownRef} className={cn(dropdownVariants({ open }), className)}>
        {typeof trigger === 'function' ? trigger({ open, toggle, close }) : trigger}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={cn(dropdownVariants({ open }), className)}>
      {typeof trigger === 'function' ? trigger({ open, toggle, close }) : trigger}
      {createPortal(menuContent, document.body)}
    </div>
  );
}

// Dropdown trigger helper
export function DropdownTrigger({
  children,
  onClick,
  className,
  ...props
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('inline-flex items-center gap-1.5', className)}
      {...props}
    >
      {children}
      <Icon name="chevronDown" size="sm" aria-hidden="true" />
    </button>
  );
}