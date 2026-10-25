// Skeleton — Loading placeholder component
'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';

const skeletonVariants = tv({
  base: 'skeleton rounded',
  variants: {
    variant: {
      text: 'h-4 max-w-[80%]',
      title: 'h-6 max-w-[60%]',
      card: 'h-32 rounded-lg',
      avatar: 'rounded-full',
      button: 'h-10 rounded-lg w-24',
      input: 'h-10 rounded-lg',
      circular: 'rounded-full',
      rectangular: 'rounded-lg',
      badge: 'h-5 rounded-full w-16'
    },
    size: {
      sm: '',
      md: '',
      lg: ''
    }
  },
  defaultVariants: {
    variant: 'rectangular',
    size: 'md'
  },
  compoundVariants: [
    {
      variant: 'avatar',
      size: 'sm',
      className: 'w-8 h-8'
    },
    {
      variant: 'avatar',
      size: 'md',
      className: 'w-10 h-10'
    },
    {
      variant: 'avatar',
      size: 'lg',
      className: 'w-12 h-12'
    },
    {
      variant: 'button',
      size: 'sm',
      className: 'h-8 w-20'
    },
    {
      variant: 'button',
      size: 'lg',
      className: 'h-12 w-32'
    }
  ]
});

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof skeletonVariants.variants.variant;
  size?: keyof typeof skeletonVariants.variants.size;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({
    className,
    variant = 'rectangular',
    size = 'md',
    width,
    height,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          skeletonVariants({ variant, size }),
          className
        )}
        style={{
          width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
          height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Pre-built skeleton layouts
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 p-6 glass rounded-xl', className)}>
      <div className="flex items-center gap-4">
        <Skeleton variant="avatar" size="md" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="title" width="40%" />
          <Skeleton variant="text" width="80%" />
        </div>
      </div>
      <Skeleton variant="rectangular" height="120px" />
      <div className="flex items-center gap-3">
        <Skeleton variant="button" width="100px" />
        <Skeleton variant="button" width="100px" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton variant="text" width="80%" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3 border-t border-[var(--color-border)]">
                  <Skeleton variant="text" width={colIndex === 0 ? '60%' : '80%'} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonList({ items = 5, className }: { items?: number; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 glass rounded-lg">
          <Skeleton variant="avatar" size="md" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="title" width="40%" />
            <Skeleton variant="text" width="60%" />
          </div>
          <Skeleton variant="badge" width="80px" />
        </div>
      ))}
    </div>
  );
}