// Tabs — Tab component with keyboard navigation
'use client';

import { forwardRef, useState, useRef, useEffect, ReactNode, KeyboardEvent } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Text } from '../primitives/Text';

const tabsVariants = tv({
  base: 'w-full',
  variants: {
    variant: {
      default: '',
      glass: 'glass rounded-xl p-1',
      pills: '',
      underline: 'border-b border-[var(--color-border)]'
    },
    orientation: {
      horizontal: 'flex flex-col',
      vertical: 'flex-row'
    }
  },
  defaultVariants: {
    variant: 'default',
    orientation: 'horizontal'
  }
});

const tabListVariants = tv({
  base: 'flex gap-1',
  variants: {
    variant: {
      default: '',
      glass: '',
      pills: '',
      underline: 'border-b border-[var(--color-border)] -mb-px'
    },
    orientation: {
      horizontal: 'flex-row',
      vertical: 'flex-col'
    }
  },
  defaultVariants: {
    variant: 'default',
    orientation: 'horizontal'
  }
});

const tabTriggerVariants = tv({
  base: 'relative flex items-center justify-center gap-1.5 font-medium transition-all duration-fast focus-ring rounded-lg select-none whitespace-nowrap',
  variants: {
    variant: {
      default: 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] data-[state=active]:text-[var(--color-foreground)] data-[state=active]:font-semibold',
      glass: 'glass-subtle text-[var(--color-muted-foreground)] data-[state=active]:glass data-[state=active]:text-[var(--glass-text)]',
      pills: 'rounded-lg px-4 py-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-[var(--color-primary-foreground)] data-[state=active]:shadow-md',
      underline: 'pb-3 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] data-[state=active]:text-[var(--color-primary)] data-[state=active]:font-semibold'
    },
    size: {
      sm: 'px-3 py-1.5 text-body-sm',
      md: 'px-4 py-2 text-body-sm',
      lg: 'px-6 py-3 text-body'
    },
    disabled: {
      true: 'opacity-50 cursor-not-allowed pointer-events-none',
      false: ''
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
    disabled: false
  }
});

const tabContentVariants = tv({
  base: 'mt-4 animate-fade-in-up animate-ease-out animate-fill-forwards',
  variants: {
    variant: {
      default: '',
      glass: '',
      pills: '',
      underline: ''
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

export interface TabItem {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: keyof typeof tabsVariants.variants.variant;
  orientation?: keyof typeof tabsVariants.variants.orientation;
  size?: keyof typeof tabTriggerVariants.variants.size;
  className?: string;
  children?: ReactNode;
}

export function Tabs({
  tabs,
  value,
  onChange,
  variant = 'default',
  orientation = 'horizontal',
  size = 'md',
  className,
  children
}: TabsProps) {
  const [focusedIndex, setFocusedIndex] = useState(
    tabs.findIndex(t => t.value === value)
  );
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const enabledTabs = tabs.filter(t => !t.disabled);
    const enabledIndex = enabledTabs.findIndex(t => t.value === tabs[index].value);

    let newIndex = enabledIndex;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = (enabledIndex + 1) % enabledTabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = (enabledIndex - 1 + enabledTabs.length) % enabledTabs.length;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = enabledTabs.length - 1;
        break;
      default:
        return;
    }

    const newTab = enabledTabs[newIndex];
    const originalIndex = tabs.findIndex(t => t.value === newTab.value);
    setFocusedIndex(originalIndex);
    tabRefs.current[originalIndex]?.focus();
  };

  return (
    <div className={cn(tabsVariants({ variant, orientation }), className)}>
      <div
        role="tablist"
        aria-orientation={orientation}
        className={cn(tabListVariants({ variant, orientation }))}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.value}
            ref={el => { tabRefs.current[index] = el; }}
            role="tab"
            id={`tab-${tab.value}`}
            aria-selected={tab.value === value}
            aria-controls={`panel-${tab.value}`}
            tabIndex={tab.value === value ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.value)}
            onKeyDown={e => handleKeyDown(e, index)}
            onFocus={() => setFocusedIndex(index)}
            className={cn(
              tabTriggerVariants({ variant, size, disabled: tab.disabled }),
              'data-[state=active]:relative'
            )}
            data-state={tab.value === value ? 'active' : 'inactive'}
            data-disabled={tab.disabled}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            {tab.label}
            {variant === 'underline' && tab.value === value && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-[var(--color-primary)] rounded-full" />
            )}
          </button>
        ))}
      </div>
      <div id={`panel-${value}`} role="tabpanel" aria-labelledby={`tab-${value}`} className={cn(tabContentVariants({ variant }))}>
        {children}
      </div>
    </div>
  );
}