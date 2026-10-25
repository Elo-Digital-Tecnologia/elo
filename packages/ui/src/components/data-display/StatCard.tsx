// StatCard — Statistic card component for dashboards
'use client';

import { forwardRef, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Text } from '../primitives/Text';
import { Card } from '../composite/Card';

const statCardVariants = tv({
  base: 'glass',
  variants: {
    variant: {
      default: '',
      primary: 'glass-primary',
      success: 'bg-[var(--color-status-success-bg)] border border-[var(--color-status-success)]/20',
      warning: 'bg-[var(--color-status-warning-bg)] border border-[var(--color-status-warning)]/20',
      error: 'bg-[var(--color-status-error-bg)] border border-[var(--color-status-error)]/20',
      info: 'bg-[var(--color-status-info-bg)] border border-[var(--color-status-info)]/20'
    },
    size: {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'md'
  }
});

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
    positive?: boolean;
  };
  icon?: keyof typeof Icons;
  iconColor?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: 'up' | 'down' | 'neutral';
  variant?: keyof typeof statCardVariants.variants.variant;
  size?: keyof typeof statCardVariants.variants.size;
  className?: string;
  children?: ReactNode;
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({
    className,
    title,
    value,
    change,
    icon,
    iconColor = 'primary',
    trend = 'neutral',
    variant = 'default',
    size = 'md',
    children
  }, ref) => {
    const iconColors = {
      primary: 'text-[var(--color-primary)]',
      success: 'text-[var(--color-status-success)]',
      warning: 'text-[var(--color-status-warning)]',
      error: 'text-[var(--color-destructive)]',
      info: 'text-[var(--color-primary)]'
    };

    const trendIcons: Record<'up' | 'down' | 'neutral', keyof typeof Icons> = {
      up: 'trendingUp',
      down: 'trendingDown',
      neutral: 'minus'
    };

    const trendColors = {
      up: 'text-[var(--color-status-success)]',
      down: 'text-[var(--color-destructive)]',
      neutral: 'text-[var(--color-muted-foreground)]'
    };

    return (
      <Card
        ref={ref}
        variant="glass"
        padding={size}
        className={cn(statCardVariants({ variant, size }), className)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Text as="p" size="body-sm" color="muted" className="mb-1">
              {title}
            </Text>
            <Text as="p" className="text-h3 font-bold tabular-nums" color="default">
              {value}
            </Text>
            {change && (
              <div className="flex items-center gap-1.5 mt-2">
                <Icon
                  name={trendIcons[trend]}
                  size="xs"
                  className={trendColors[trend]}
                  aria-hidden="true"
                />
                <Text
                  as="span"
                  size="body-sm"
                  weight="medium"
                  className={trendColors[trend]}
                >
                  {change.positive !== false ? '+' : ''}{change.value}%
                </Text>
                {change.label && (
                  <Text as="span" size="body-xs" color="muted">
                    {change.label}
                  </Text>
                )}
              </div>
            )}
          </div>
          {icon && (
            <div className={cn(
              'flex-shrink-0 p-3 rounded-xl',
              iconColors[iconColor]
            )}>
              <Icon name={icon} size="xl" aria-hidden="true" />
            </div>
          )}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </Card>
    );
  }
);

StatCard.displayName = 'StatCard';

// StatCard grid for dashboards
export interface StatCardGridProps {
  stats: Array<StatCardProps & { key?: string }>;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatCardGrid({
  stats,
  columns = 4,
  gap = 'md',
  className
}: StatCardGridProps) {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)} role="list">
      {stats.map((stat, index) => (
        <StatCard key={stat.key || index} {...stat} />
      ))}
    </div>
  );
}