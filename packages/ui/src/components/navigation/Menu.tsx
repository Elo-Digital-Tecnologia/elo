// Menu — Context menu / navigation menu component
'use client';

import { forwardRef, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { useClickOutside } from '../../hooks';

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
      center: 'left-1/2 -translate-x-1/2',
      end: 'right-0'
    }
  },
  defaultVariants: {
    side: 'bottom',
    align: 'start'
  }
});

export interface MenuItem {
  label: string;
  onClick: () => void;
  icon?: keyof typeof Icons;
  disabled?: boolean;
  dangerous?: boolean;
  shortcut?: string;
  children?: MenuItem[];
}

export type MenuTriggerRenderProps = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

export interface MenuProps {
  trigger: ReactNode | ((props: MenuTriggerRenderProps) => ReactNode);
  items: MenuItem[];
  side?: keyof typeof menuVariants.variants.side;
  align?: keyof typeof menuVariants.variants.align;
  closeOnClick?: boolean;
  className?: string;
}

export function Menu({
  trigger,
  items,
  side = 'bottom',
  align = 'start',
  closeOnClick = true,
  className
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useClickOutside<HTMLDivElement>(() => setOpen(false), open);

  const toggle = useCallback(() => setOpen(prev => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    const enabledItems = items.filter(item => !item.disabled);
    const focusedIndex = enabledItems.findIndex(item => item.label === e.currentTarget.textContent?.trim());

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
      <div ref={dropdownRef} className={className}>
        {typeof trigger === 'function' ? trigger({ open, toggle, close }) : trigger}
      </div>
    );
  }

  const renderItems = (items: MenuItem[], level = 0) => (
    <>
      {items.map((item, index) => (
        item.children && item.children.length > 0 ? (
          <MenuSubmenu
            key={index}
            item={item}
            level={level}
            closeOnClick={closeOnClick}
            onClose={close}
          />
        ) : (
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
              'focus-visible:outline-none focus-visible:bg-[var(--glass-bg-hover)]',
              level > 0 && 'pl-8'
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
        )
      ))}
    </>
  );

  const menuContent = (
    <div
      ref={menuRef}
      className={cn(menuVariants({ side, align }))}
      role="menu"
      aria-orientation="vertical"
      onKeyDown={handleKeyDown}
    >
      {renderItems(items)}
    </div>
  );

  if (typeof window === 'undefined') {
    return (
      <div ref={dropdownRef} className={className}>
        {typeof trigger === 'function' ? trigger({ open, toggle, close }) : trigger}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={className}>
      {typeof trigger === 'function' ? trigger({ open, toggle, close }) : trigger}
      {createPortal(menuContent, document.body)}
    </div>
  );
}

function MenuSubmenu({
  item,
  level,
  closeOnClick,
  onClose
}: {
  item: MenuItem;
  level: number;
  closeOnClick: boolean;
  onClose: () => void;
}) {
  const [subOpen, setSubOpen] = useState(false);
  const submenuRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (!item.disabled) {
      setSubOpen(!subOpen);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSubOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        role="menuitem"
        aria-haspopup="true"
        aria-expanded={subOpen}
        disabled={item.disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 text-body-sm transition-colors duration-fast',
          'hover:bg-[var(--glass-bg-hover)]',
          item.disabled && 'opacity-50 cursor-not-allowed',
          'focus-visible:outline-none focus-visible:bg-[var(--glass-bg-hover)]'
        )}
        tabIndex={-1}
      >
        <span className="flex items-center gap-2 flex-1">
          {item.icon && <Icon name={item.icon} size="sm" aria-hidden="true" />}
          {item.label}
        </span>
        <Icon
          name={subOpen ? 'chevronUp' : 'chevronRight'}
          size="xs"
          className="text-[var(--color-muted-foreground)] transition-transform duration-fast"
          aria-hidden="true"
        />
      </button>

      {subOpen && (
        <div
          ref={submenuRef}
          className={cn(
            'absolute left-full top-0 ml-2 glass-strong rounded-lg py-1.5 min-w-[180px] shadow-glass-strong',
            'animate-fade-in-left animate-ease-out animate-fill-forwards'
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {item.children?.map((child, index) => (
            child.children && child.children.length > 0 ? (
              <MenuSubmenu
                key={index}
                item={child}
                level={level + 1}
                closeOnClick={closeOnClick}
                onClose={onClose}
              />
            ) : (
              <button
                key={index}
                role="menuitem"
                disabled={child.disabled}
                onClick={() => {
                  if (!child.disabled) {
                    child.onClick();
                    if (closeOnClick) onClose();
                  }
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-body-sm transition-colors duration-fast',
                  'hover:bg-[var(--glass-bg-hover)]',
                  child.disabled && 'opacity-50 cursor-not-allowed',
                  child.dangerous && 'text-[var(--color-destructive)]',
                  'focus-visible:outline-none focus-visible:bg-[var(--glass-bg-hover)]'
                )}
                tabIndex={-1}
              >
                {child.icon && <Icon name={child.icon} size="sm" aria-hidden="true" />}
                <span className="flex-1 text-left">{child.label}</span>
                {child.shortcut && (
                  <kbd className="text-body-xs text-[var(--color-muted-foreground)] px-1.5 py-0.5 rounded bg-[var(--color-muted)] font-mono">
                    {child.shortcut}
                  </kbd>
                )}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// Context menu hook
export function useContextMenu() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const open = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const close = useCallback(() => {
    setPosition(null);
  }, []);

  useEffect(() => {
    if (!position) return;
    const handleClick = () => close();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [position, close]);

  return { position, open, close };
}