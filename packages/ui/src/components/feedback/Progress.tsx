// Progress — Progress bar component
'use client';

import { forwardRef, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Text } from '../primitives/Text';

const progressVariants = tv({
  base: 'relative overflow-hidden rounded-full bg-[var(--color-muted)]',
  variants: {
    size: {
      xs: 'h-1',
      sm: 'h-1.5',
      md: 'h-2',
      lg: 'h-3',
      xl: 'h-4'
    },
    variant: {
      default: '',
      success: '',
      warning: '',
      error: '',
      info: ''
    },
    striped: {
      true: '',
      false: ''
    },
    animated: {
      true: '',
      false: ''
    }
  },
  defaultVariants: {
    size: 'md',
    variant: 'default',
    striped: false,
    animated: false
  }
});

const progressBarVariants = tv({
  base: 'h-full rounded-full transition-all duration-500 ease-out',
  variants: {
    variant: {
      default: 'bg-[var(--color-primary)]',
      success: 'bg-[var(--color-status-success)]',
      warning: 'bg-[var(--color-status-warning)]',
      error: 'bg-[var(--color-destructive)]',
      info: 'bg-[var(--color-primary)]'
    }
  },
  defaultVariants: {
    variant: 'default'
  },
  compoundVariants: [
    {
      striped: true,
      className: 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:20px_100%]'
    }
  ]
});

export interface ProgressProps {
  value: number;
  max?: number;
  min?: number;
  variant?: keyof typeof progressVariants.variants.variant;
  size?: keyof typeof progressVariants.variants.size;
  striped?: boolean;
  animated?: boolean;
  showLabel?: boolean;
  label?: ReactNode;
  className?: string;
  'aria-label'?: string;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({
    className,
    value,
    max = 100,
    min = 0,
    variant = 'default',
    size = 'md',
    striped = false,
    animated = false,
    showLabel = false,
    label,
    'aria-label': ariaLabel,
    ...props
  }, ref) => {
    const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

    return (
      <div
        ref={ref}
        className={cn(progressVariants({ size, variant, striped, animated }), className)}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={ariaLabel}
        {...props}
      >
        <div
          className={cn(progressBarVariants({ variant }), striped && 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:20px_100%]')}
          style={{ width: `${percentage}%` }}
        />
        {animated && striped && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent bg-[length:40px_100%] animate-shimmer" />
        )}
        {(showLabel || label) && (
          <div className="absolute inset-0 flex items-center justify-center text-body-xs font-medium text-white mix-blend-difference">
            {label ?? `${Math.round(percentage)}%`}
          </div>
        )}
      </div>
    )
  }
);

Progress.displayName = 'Progress';

// Circular progress
const circularProgressVariants = tv({
  base: 'relative inline-flex items-center justify-center',
  variants: {
    size: {
      sm: 'w-10 h-10',
      md: 'w-16 h-16',
      lg: 'w-24 h-24',
      xl: 'w-32 h-32'
    },
    thickness: {
      thin: '2',
      normal: '4',
      thick: '6'
    }
  },
  defaultVariants: {
    size: 'md',
    thickness: 'normal'
  }
});

export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: keyof typeof circularProgressVariants.variants.size;
  thickness?: keyof typeof circularProgressVariants.variants.thickness;
  variant?: keyof typeof progressVariants.variants.variant;
  showLabel?: boolean;
  label?: ReactNode;
  className?: string;
  'aria-label'?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 'md',
  thickness = 'normal',
  variant = 'default',
  showLabel = false,
  label,
  className,
  'aria-label': ariaLabel
}: CircularProgressProps) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  const radius = 16; // SVG radius
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };

  const thicknessValues = { thin: 2, normal: 4, thick: 6 };
  const strokeWidth = thicknessValues[thickness];
  const adjustedRadius = radius - strokeWidth / 2;
  const adjustedCircumference = 2 * Math.PI * adjustedRadius;
  const adjustedOffset = adjustedCircumference - (percentage / 100) * adjustedCircumference;

  const variantColors = {
    default: 'var(--color-primary)',
    success: 'var(--color-status-success)',
    warning: 'var(--color-status-warning)',
    error: 'var(--color-destructive)',
    info: 'var(--color-primary)'
  };

  return (
    <div
      className={cn(circularProgressVariants({ size, thickness }), className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={ariaLabel}
    >
      <svg className="transform -rotate-90" width="100%" height="100%">
        <circle
          className="text-[var(--color-muted)]"
          cx={radius}
          cy={radius}
          r={adjustedRadius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          className={cn('transition-all duration-500 ease-out', `stroke-[${variantColors[variant]}]`)}
          cx={radius}
          cy={radius}
          r={adjustedRadius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={adjustedCircumference}
          strokeDashoffset={adjustedOffset}
          strokeLinecap="round"
        />
      </svg>
      {(showLabel || label) && (
        <div className="absolute inset-0 flex items-center justify-center">
          {label ?? (
            <Text className="text-h5 font-bold tabular-nums" color="default">
              {Math.round(percentage)}%
            </Text>
          )}
        </div>
      )}
    </div>
  );
}

// Step progress (for multi-step forms)
export interface StepProgressProps {
  steps: number;
  currentStep: number;
  variant?: keyof typeof progressVariants.variants.variant;
  size?: keyof typeof progressVariants.variants.size;
  className?: string;
}

export function StepProgress({ steps, currentStep, variant = 'default', size = 'md', className }: StepProgressProps) {
  const percentage = (currentStep / steps) * 100;

  return (
    <div className={cn('relative', className)}>
      <Progress value={percentage} max={100} variant={variant} size={size} />
      <div className="flex justify-between mt-3">
        {Array.from({ length: steps }, (_, i) => (
          <div
            key={i}
            className={cn(
              'flex flex-col items-center gap-1',
              i < steps - 1 && 'flex-1'
            )}
          >
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-body-xs font-medium transition-all duration-300',
              i < currentStep
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                : i === currentStep
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] ring-2 ring-[var(--color-primary)] ring-offset-2'
                : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
            )}>
              {i < currentStep ? '✓' : i + 1}
            </div>
            <Text as="span" size="body-xs" color={i <= currentStep ? 'default' : 'muted'} className="mt-1 text-center">
              Passo {i + 1}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}