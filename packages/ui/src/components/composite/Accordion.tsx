// Accordion — Collapsible accordion component
'use client';

import { forwardRef, useState, useRef, useEffect, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Text } from '../primitives/Text';

const accordionVariants = tv({
  base: 'w-full',
  variants: {
    variant: {
      default: 'space-y-2',
      glass: 'space-y-2',
      bordered: 'space-y-0 border border-[var(--color-border)] rounded-lg overflow-hidden',
      flush: 'space-y-0'
    },
    allowMultiple: {
      true: '',
      false: ''
    }
  },
  defaultVariants: {
    variant: 'default',
    allowMultiple: false
  }
});

const itemVariants = tv({
  base: 'overflow-hidden transition-all duration-normal',
  variants: {
    variant: {
      default: '',
      glass: 'glass rounded-lg',
      bordered: 'border-b border-[var(--color-border)] last:border-0',
      flush: ''
    },
    open: {
      true: '',
      false: ''
    }
  },
  defaultVariants: {
    variant: 'default',
    open: false
  }
});

const triggerVariants = tv({
  base: 'w-full flex items-center justify-between gap-4 px-4 py-3 text-left font-medium transition-colors duration-fast focus-ring rounded-lg',
  variants: {
    variant: {
      default: 'text-[var(--color-foreground)] hover:bg-[var(--color-muted)]',
      glass: 'text-[var(--glass-text)] hover:bg-[var(--glass-bg-hover)]',
      bordered: 'bg-[var(--color-surface)] hover:bg-[var(--color-muted)]',
      flush: 'text-[var(--color-foreground)] hover:bg-[var(--color-muted)]'
    },
    disabled: {
      true: 'opacity-50 cursor-not-allowed pointer-events-none',
      false: ''
    }
  },
  defaultVariants: {
    variant: 'default',
    disabled: false
  }
});

const contentVariants = tv({
  base: 'overflow-hidden transition-all duration-normal',
  variants: {
    open: {
      true: 'max-h-96 opacity-100 pb-4',
      false: 'max-h-0 opacity-0'
    }
  },
  defaultVariants: {
    open: false
  }
});

export interface AccordionItem {
  value: string;
  title: string;
  description?: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  variant?: keyof typeof accordionVariants.variants.variant;
  allowMultiple?: boolean;
  className?: string;
}

export function Accordion({
  items,
  value,
  onChange,
  variant = 'default',
  allowMultiple = false,
  className
}: AccordionProps) {
  const [openValues, setOpenValues] = useState<string[]>(
    typeof value === 'string' ? [value] : (value ?? [])
  );

  const isControlled = value !== undefined;

  const handleToggle = (itemValue: string) => {
    let newOpenValues: string[];
    if (allowMultiple) {
      newOpenValues = openValues.includes(itemValue)
        ? openValues.filter(v => v !== itemValue)
        : [...openValues, itemValue];
    } else {
      newOpenValues = openValues.includes(itemValue) ? [] : [itemValue];
    }

    if (!isControlled) {
      setOpenValues(newOpenValues);
    }
    onChange?.(allowMultiple ? newOpenValues : newOpenValues[0] ?? '');
  };

  const isOpen = (itemValue: string) => {
    const values = isControlled
      ? (typeof value === 'string' ? [value] : value)
      : openValues;
    return values.includes(itemValue);
  };

  return (
    <div className={cn(accordionVariants({ variant, allowMultiple }), className)}>
      {items.map(item => (
        <AccordionItemComponent
          key={item.value}
          item={item}
          isOpen={isOpen(item.value)}
          onToggle={() => handleToggle(item.value)}
          variant={variant}
        />
      ))}
    </div>
  );
}

function AccordionItemComponent({
  item,
  isOpen,
  onToggle,
  variant
}: {
  item: AccordionItem;
  isOpen: boolean;
  onToggle: () => void;
  variant: keyof typeof itemVariants.variants.variant;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const contentHeightRef = useRef(0);

  useEffect(() => {
    if (contentRef.current) {
      contentHeightRef.current = contentRef.current.scrollHeight;
    }
  }, [item.content, isOpen]);

  return (
    <div className={cn(itemVariants({ variant, open: isOpen }))}>
      <button
        type="button"
        onClick={onToggle}
        disabled={item.disabled}
        className={cn(triggerVariants({ variant, disabled: item.disabled }))}
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${item.value}`}
        id={`accordion-trigger-${item.value}`}
      >
        <div className="flex-1 text-left">
          <Text weight="medium" color="default">
            {item.title}
          </Text>
          {item.description && (
            <Text as="p" color="muted" size="body-sm" className="mt-0.5">
              {item.description}
            </Text>
          )}
        </div>
        <Icon
          name="chevronDown"
          size="md"
          className={cn(
            'flex-shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-fast',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>
      <div
        id={`accordion-content-${item.value}`}
        role="region"
        aria-labelledby={`accordion-trigger-${item.value}`}
        className={cn(contentVariants({ open: isOpen }))}
        style={{ maxHeight: isOpen ? contentHeightRef.current : 0 }}
      >
        <div ref={contentRef} className="px-4">
          {item.content}
        </div>
      </div>
    </div>
  );
}