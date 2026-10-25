// Stepper — Step indicator component
'use client';

import { forwardRef, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Text } from '../primitives/Text';

const stepperVariants = tv({
  base: 'flex',
  variants: {
    orientation: {
      horizontal: 'flex-row items-center',
      vertical: 'flex-col items-start gap-6'
    },
    variant: {
      default: '',
      numbered: '',
      simple: ''
    }
  },
  defaultVariants: {
    orientation: 'horizontal',
    variant: 'default'
  }
});

const stepVariants = tv({
  base: 'relative flex items-center',
  variants: {
    orientation: {
      horizontal: 'flex-1',
      vertical: 'w-full'
    }
  },
  defaultVariants: {
    orientation: 'horizontal'
  }
});

const stepIndicatorVariants = tv({
  base: 'flex items-center justify-center font-semibold transition-all duration-fast',
  variants: {
    size: {
      sm: 'w-6 h-6 text-body-xs',
      md: 'w-8 h-8 text-body-sm',
      lg: 'w-10 h-10 text-body'
    },
    state: {
      pending: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
      active: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[var(--shadow-primary-glow)]',
      completed: 'bg-[var(--color-status-success)] text-[var(--color-status-success-foreground)]',
      error: 'bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)]'
    }
  },
  defaultVariants: {
    size: 'md',
    state: 'pending'
  }
});

const stepConnectorVariants = tv({
  base: 'flex-1 h-px transition-colors duration-fast',
  variants: {
    state: {
      pending: 'bg-[var(--color-border)]',
      completed: 'bg-[var(--color-status-success)]',
      active: 'bg-[var(--color-primary)]',
      error: 'bg-[var(--color-destructive)]'
    }
  },
  defaultVariants: {
    state: 'pending'
  }
});

export interface Step {
  label: string;
  description?: string;
  icon?: keyof typeof Icons;
  status?: 'pending' | 'active' | 'completed' | 'error';
  disabled?: boolean;
}

export interface StepperProps {
  steps: Step[];
  currentStep: number;
  orientation?: keyof typeof stepperVariants.variants.orientation;
  variant?: keyof typeof stepperVariants.variants.variant;
  size?: keyof typeof stepIndicatorVariants.variants.size;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  orientation = 'horizontal',
  variant = 'default',
  size = 'md',
  onStepClick,
  className
}: StepperProps) {
  return (
    <nav
      aria-label="Progresso dos passos"
      className={cn(stepperVariants({ orientation, variant }), className)}
    >
      <ol className="flex w-full" role="list">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          // An explicit status on the step (e.g. "error") always wins over the
          // position-based default, so a failed step can be flagged regardless
          // of where it sits relative to currentStep.
          const stepStatus = step.status ?? (index < currentStep ? 'completed' : index === currentStep ? 'active' : 'pending');
          const isClickable = onStepClick && !step.disabled && index <= currentStep;

          return (
            <li key={index} className={cn(stepVariants({ orientation }))}>
              <div
                className="flex flex-col items-center gap-2"
                role="listitem"
                aria-current={index === currentStep ? 'step' : undefined}
              >
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(index)}
                  disabled={!isClickable}
                  className={cn(
                    stepIndicatorVariants({ size, state: stepStatus }),
                    'rounded-full flex-shrink-0',
                    isClickable && 'hover:opacity-90 cursor-pointer focus-ring',
                    step.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  aria-label={`Passo ${index + 1}: ${step.label}`}
                  aria-disabled={step.disabled}
                >
                  {variant === 'numbered' ? (
                    index < currentStep ? (
                      <Icon name="check" size={size === 'sm' ? 'xs' : size === 'md' ? 'sm' : 'md'} strokeWidth={3} aria-hidden="true" />
                    ) : (
                      <span aria-hidden="true">{index + 1}</span>
                    )
                  ) : step.icon && stepStatus === 'pending' ? (
                    <Icon name={step.icon} size={size === 'sm' ? 'xs' : size === 'md' ? 'sm' : 'md'} aria-hidden="true" />
                  ) : stepStatus === 'completed' ? (
                    <Icon name="check" size={size === 'sm' ? 'xs' : size === 'md' ? 'sm' : 'md'} strokeWidth={3} aria-hidden="true" />
                  ) : stepStatus === 'error' ? (
                    <Icon name="alertCircle" size={size === 'sm' ? 'xs' : size === 'md' ? 'sm' : 'md'} aria-hidden="true" />
                  ) : null}
                </button>
                <div className="text-center min-w-0">
                  <Text
                    as="span"
                    weight={stepStatus === 'active' ? 'semibold' : 'medium'}
                    color={stepStatus === 'active' ? 'default' : 'muted'}
                    size={size === 'sm' ? 'body-xs' : 'body-sm'}
                    className="truncate"
                  >
                    {step.label}
                  </Text>
                  {step.description && (
                    <Text as="span" size="body-xs" color="muted" className="truncate max-w-[120px]">
                      {step.description}
                    </Text>
                  )}
                </div>
              </div>
              {!isLast && orientation === 'horizontal' && (
                <div
                  className={cn(stepConnectorVariants({ state: stepStatus }))}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Vertical stepper for forms/wizards
export interface VerticalStepperProps extends Omit<StepperProps, 'orientation'> {}

export function VerticalStepper(props: VerticalStepperProps) {
  return <Stepper {...props} orientation="vertical" />;
}