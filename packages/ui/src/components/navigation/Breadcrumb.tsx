// Breadcrumb — Navigation breadcrumb component
'use client';

import { forwardRef, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Text } from '../primitives/Text';

const breadcrumbVariants = tv({
  base: 'flex items-center gap-1.5 flex-wrap',
  variants: {
    size: {
      sm: 'text-body-sm',
      md: 'text-body',
      lg: 'text-body-lg'
    },
    separator: {
      chevron: '',
      slash: '',
      dot: '',
      arrow: ''
    }
  },
  defaultVariants: {
    size: 'md',
    separator: 'chevron'
  }
});

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: keyof typeof Icons;
  current?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  size?: keyof typeof breadcrumbVariants.variants.size;
  separator?: keyof typeof breadcrumbVariants.variants.separator;
  className?: string;
  maxItems?: number;
}

export function Breadcrumb({
  items,
  size = 'md',
  separator = 'chevron',
  className,
  maxItems = 5
}: BreadcrumbProps) {
  const separators = {
    chevron: <Icon name="chevronRight" size="xs" aria-hidden="true" />,
    slash: <Text as="span" color="muted" aria-hidden="true">/</Text>,
    dot: <Text as="span" color="muted" aria-hidden="true">·</Text>,
    arrow: <Icon name="arrowRight" size="xs" aria-hidden="true" />
  };

  const Separator = separators[separator];

  // Truncate items if too many
  const displayItems = items.length > maxItems
    ? [
        items[0],
        { label: '...', current: false } as BreadcrumbItem,
        ...items.slice(-maxItems + 2)
      ]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn(breadcrumbVariants({ size }), className)}>
      <ol className="flex items-center gap-1.5 flex-wrap" role="list">
        {displayItems.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {index > 0 && <span className="flex-shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true">{Separator}</span>}
            {item.current || (index === displayItems.length - 1 && !item.href && !item.onClick) ? (
              <span
                className={cn(
                  'font-medium text-[var(--color-foreground)]',
                  size === 'sm' && 'text-body-sm',
                  size === 'lg' && 'text-body-lg'
                )}
                aria-current="page"
              >
                {item.icon && <Icon name={item.icon} size="sm" className="mr-1" aria-hidden="true" />}
                {item.label}
              </span>
            ) : item.href || item.onClick ? (
              <a
                href={item.href}
                onClick={item.onClick}
                className={cn(
                  'hover:text-[var(--color-primary)] transition-colors font-medium',
                  size === 'sm' && 'text-body-sm',
                  size === 'lg' && 'text-body-lg'
                )}
              >
                {item.icon && <Icon name={item.icon} size="sm" className="mr-1" aria-hidden="true" />}
                {item.label}
              </a>
            ) : (
              <span className={cn(
                'text-[var(--color-muted-foreground)]',
                size === 'sm' && 'text-body-sm',
                size === 'lg' && 'text-body-lg'
              )}>
                {item.icon && <Icon name={item.icon} size="sm" className="mr-1" aria-hidden="true" />}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}