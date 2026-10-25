// Spinner — Loading spinner component
'use client';

import { forwardRef, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Text } from '../primitives/Text';

const spinnerVariants = tv({
  base: 'inline-flex items-center justify-center',
  variants: {
    size: {
      xs: 'w-3 h-3 border-[1px]',
      sm: 'w-4 h-4 border-[1.5px]',
      md: 'w-6 h-6 border-2',
      lg: 'w-8 h-8 border-[2.5px]',
      xl: 'w-10 h-10 border-3',
      '2xl': 'w-12 h-12 border-4'
    },
    variant: {
      default: 'border-[var(--color-border)] border-t-[var(--color-primary)]',
      primary: 'border-[var(--color-primary-light)] border-t-[var(--color-primary)]',
      white: 'border-white/30 border-t-white',
      success: 'border-[var(--color-status-success)]/30 border-t-[var(--color-status-success)]',
      warning: 'border-[var(--color-status-warning)]/30 border-t-[var(--color-status-warning)]',
      error: 'border-[var(--color-destructive)]/30 border-t-[var(--color-destructive)]'
    },
    speed: {
      slow: 'animate-spin-slow',
      normal: 'animate-spin',
      fast: 'animate-spin-fast'
    }
  },
  defaultVariants: {
    size: 'md',
    variant: 'default',
    speed: 'normal'
  }
});

const spinnerSpeed = {
  slow: '2s',
  normal: '1s',
  fast: '0.6s'
} as const;

export interface SpinnerProps {
  size?: keyof typeof spinnerVariants.variants.size;
  variant?: keyof typeof spinnerVariants.variants.variant;
  speed?: keyof typeof spinnerVariants.variants.speed;
  label?: string;
  className?: string;
  'aria-label'?: string;
}

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({
    className,
    size = 'md',
    variant = 'default',
    speed = 'normal',
    label,
    'aria-label': ariaLabel = 'Carregando',
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(spinnerVariants({ size, variant, speed }), className)}
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
        style={{ animationDuration: spinnerSpeed[speed] }}
        {...props}
      >
        {label && <Text as="span" className="sr-only">{label}</Text>}
      </div>
    )
  }
);

Spinner.displayName = 'Spinner';

// Spinner with text
export interface SpinnerWithTextProps extends SpinnerProps {
  text?: ReactNode;
}

export function SpinnerWithText({
  text,
  size = 'md',
  variant = 'default',
  speed = 'normal',
  className,
  'aria-label': ariaLabel
}: SpinnerWithTextProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)} role="status" aria-live="polite" aria-label={ariaLabel}>
      <Spinner size={size} variant={variant} speed={speed} />
      {text && <Text as="p" size="body-sm" color="muted">{text}</Text>}
    </div>
  );
}

// Overlay spinner (full screen)
export interface OverlaySpinnerProps {
  text?: ReactNode;
  size?: keyof typeof spinnerVariants.variants.size;
  variant?: keyof typeof spinnerVariants.variants.variant;
  speed?: keyof typeof spinnerVariants.variants.speed;
  className?: string;
  'aria-label'?: string;
}

export function OverlaySpinner({
  text,
  size = 'lg',
  variant = 'default',
  speed = 'normal',
  className,
  'aria-label': ariaLabel
}: OverlaySpinnerProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[900] flex items-center justify-center',
        'bg-[var(--color-background)]/80 backdrop-blur-sm',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <div className="glass-strong rounded-xl p-8 max-w-sm text-center">
        <Spinner size={size} variant={variant} speed={speed} className="mx-auto mb-4" />
        {text && <Text as="p" size="body-lg" color="default">{text}</Text>}
      </div>
    </div>
  );
}

// Ring spinner (SVG-based, more customizable)
const ringSpinnerVariants = tv({
  base: 'inline-block',
  variants: {
    size: {
      sm: 'w-6 h-6',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16'
    },
    thickness: {
      thin: '2',
      normal: '3',
      thick: '4'
    }
  },
  defaultVariants: {
    size: 'md',
    thickness: 'normal'
  }
});

export interface RingSpinnerProps {
  size?: keyof typeof ringSpinnerVariants.variants.size;
  thickness?: keyof typeof ringSpinnerVariants.variants.thickness;
  color?: string;
  trackColor?: string;
  speed?: keyof typeof spinnerVariants.variants.speed;
  className?: string;
  'aria-label'?: string;
}

export function RingSpinner({
  size = 'md',
  thickness = 'normal',
  color = 'var(--color-primary)',
  trackColor = 'var(--color-muted)',
  speed = 'normal',
  className,
  'aria-label': ariaLabel = 'Carregando'
}: RingSpinnerProps) {
  const thicknessValues = { thin: 2, normal: 3, thick: 4 };
  const strokeWidth = thicknessValues[thickness];
  const radius = 16;
  const circumference = 2 * Math.PI * (radius - strokeWidth / 2);

  return (
    <svg
      className={cn(ringSpinnerVariants({ size, thickness }), className)}
      width="100%"
      height="100%"
      viewBox="0 0 32 32"
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <circle
        className="text-[var(--color-muted)]"
        cx="16"
        cy="16"
        r={radius - strokeWidth / 2}
        fill="none"
        strokeWidth={strokeWidth}
      />
      <circle
        className={cn(
          'transform -rotate-90 transition-all duration-300 ease-out',
          `stroke-[${color}]`
        )}
        cx="16"
        cy="16"
        r={radius - strokeWidth / 2}
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round"
        style={{ animation: `spin ${spinnerSpeed[speed]} linear infinite` }}
      />
    </svg>
  );
}

// Dot spinner (multiple bouncing dots)
export interface DotSpinnerProps {
  color?: string;
  size?: number;
  count?: number;
  speed?: keyof typeof spinnerVariants.variants.speed;
  className?: string;
  'aria-label'?: string;
}

export function DotSpinner({
  color = 'var(--color-primary)',
  size = 8,
  count = 3,
  speed = 'normal',
  className,
  'aria-label': ariaLabel = 'Carregando'
}: DotSpinnerProps) {
  const animationDelay = speed === 'slow' ? 0.3 : speed === 'fast' ? 0.1 : 0.15;

  return (
    <div
      className={cn('inline-flex items-center gap-1', className)}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            animation: `bounce-subtle ${spinnerSpeed[speed]} ease-in-out infinite`,
            animationDelay: `${i * animationDelay}s`
          }}
        />
      ))}
    </div>
  );
}