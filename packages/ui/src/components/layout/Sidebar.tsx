// Sidebar — Navigation sidebar component
'use client';

import { forwardRef, useState, useEffect, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Button } from '../base/Button';
import { Text } from '../primitives/Text';
import { Sheet } from '../composite/Sheet';
import { useIsMobile } from '@elo-digital/ui/hooks';

export interface SidebarItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: keyof typeof Icons;
  badge?: string | number;
  badgeVariant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  disabled?: boolean;
  children?: SidebarItem[];
  isActive?: boolean;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  width?: number;
  collapsedWidth?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  className?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  ({
    className,
    sections,
    width = 260,
    collapsedWidth = 72,
    collapsible = true,
    defaultCollapsed = false,
    onCollapseChange,
    children,
    footer
  }, ref) => {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const isMobile = useIsMobile();

    // Auto-collapse on mobile
    useEffect(() => {
      if (isMobile) {
        setCollapsed(true);
      } else if (!collapsible) {
        setCollapsed(false);
      }
    }, [isMobile, collapsible]);

    const sidebarWidth = collapsed ? collapsedWidth : width;

    return (
      <aside
        ref={ref}
        className={cn(
          'fixed inset-y-0 left-0 z-[300] glass transition-all duration-normal flex flex-col',
          'border-r border-[var(--glass-border)]',
          className
        )}
        style={{ width: sidebarWidth }}
        aria-label="Navegação principal"
      >
        <div className="flex flex-col h-full">
          {/* Header / Logo area */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--glass-border)]">
            {!collapsed && children}
            {collapsible && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setCollapsed(!collapsed);
                  onCollapseChange?.(!collapsed);
                }}
                aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
                className="flex-shrink-0"
              >
                <Icon
                  name={collapsed ? 'chevronRight' : 'chevronLeft'}
                  size="md"
                  aria-hidden="true"
                />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1" role="navigation">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-1">
                {section.title && !collapsed && (
                  <Text as="h3" className="text-overline px-3 py-2 text-[var(--color-muted-foreground)]">
                    {section.title}
                  </Text>
                )}
                {section.items.map((item, itemIndex) => (
                  <SidebarItemComponent
                    key={itemIndex}
                    item={item}
                    collapsed={collapsed}
                    level={0}
                  />
                ))}
              </div>
            ))}
          </nav>

          {/* Footer */}
          {footer && (
            <div className="p-3 border-t border-[var(--glass-border)]">
              {footer}
            </div>
          )}
        </div>
      </aside>
    );
  }
);

Sidebar.displayName = 'Sidebar';

function SidebarItemComponent({
  item,
  collapsed,
  level = 0
}: {
  item: SidebarItem;
  collapsed: boolean;
  level: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (item.disabled) return;
    if (hasChildren) {
      setExpanded(!expanded);
    } else if (item.onClick) {
      item.onClick();
    }
  };

  if (collapsed && level === 0) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={item.disabled}
        className={cn(
          'relative flex items-center justify-center w-full h-10 rounded-lg transition-colors duration-fast',
          'text-[var(--color-muted-foreground)]',
          'hover:bg-[var(--glass-bg-hover)] hover:text-[var(--glass-text)]',
          'focus-ring',
          item.isActive && 'bg-[var(--glass-bg)] text-[var(--glass-text)]',
          item.disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-label={item.label}
        aria-expanded={hasChildren ? expanded : undefined}
        title={item.label}
      >
        <Icon name={item.icon || 'circle'} size="md" aria-hidden="true" />
        {item.badge && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] text-xs font-medium px-1">
            {item.badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="group">
      <button
        type="button"
        onClick={handleClick}
        disabled={item.disabled}
        className={cn(
          'flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors duration-fast',
          'text-[var(--color-foreground)]',
          'hover:bg-[var(--glass-bg-hover)]',
          'focus-ring',
          item.isActive && 'bg-[var(--glass-bg)] text-[var(--glass-text)]',
          item.disabled && 'opacity-50 cursor-not-allowed',
          hasChildren && 'justify-between'
        )}
        aria-label={item.label}
        aria-expanded={hasChildren ? expanded : undefined}
      >
        <Icon name={item.icon || 'circle'} size="md" className="flex-shrink-0" aria-hidden="true" />
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {hasChildren && !collapsed && (
          <Icon
            name={expanded ? 'chevronUp' : 'chevronDown'}
            size="sm"
            className={cn(
              'flex-shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-fast',
              'group-hover:text-[var(--color-foreground)]'
            )}
            aria-hidden="true"
          />
        )}
        {item.badge && !collapsed && (
          <span className={cn(
            'flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium',
            item.badgeVariant === 'primary' && 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
            item.badgeVariant === 'success' && 'bg-[var(--color-status-success-bg)] text-[var(--color-status-success)]',
            item.badgeVariant === 'warning' && 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning)]',
            item.badgeVariant === 'error' && 'bg-[var(--color-status-error-bg)] text-[var(--color-status-error)]',
            'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
          )}>
            {item.badge}
          </span>
        )}
      </button>

      {hasChildren && expanded && !collapsed && (
        <div className="mt-1 ml-8 space-y-1 border-l border-[var(--color-border)] pl-3">
          {item.children?.map((child, index) => (
            <SidebarItemComponent key={index} item={child} collapsed={collapsed} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// Mobile sidebar hook
export function useSidebarMobile() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen(prev => !prev);
  const close = () => setOpen(false);
  const openSidebar = () => setOpen(true);

  return { isMobile, open, toggle, close, openSidebar };
}

// Mobile sidebar wrapper
export interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function MobileSidebar({ open, onClose, children, className }: MobileSidebarProps) {
  return (
    <Sheet open={open} onClose={onClose} side="left" size="full" showHandle={false}>
      <div className="p-4">{children}</div>
    </Sheet>
  );
}