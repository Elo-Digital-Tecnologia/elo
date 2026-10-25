// Classnames utility — simple clsx wrapper with tailwind-merge
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Variant helper for compound components
export function createVariants<T extends Record<string, string>>(
  base: string,
  variants: T
): (variant?: keyof T, className?: string) => string {
  return (variant, className) => {
    const variantClass = variant ? variants[variant as keyof T] : '';
    return cn(base, variantClass, className);
  };
}

// Responsive class builder
export function responsive(
  base: string,
  breakpoints: Partial<Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', string>>
): string {
  const classes = [base];
  for (const [bp, value] of Object.entries(breakpoints)) {
    if (value) {
      classes.push(`${bp}:${value}`);
    }
  }
  return classes.join(' ');
}

// State class builder
export function states(base: string, modifiers: Record<string, boolean | undefined>): string {
  return cn(base, ...Object.entries(modifiers)
    .filter(([, enabled]) => enabled)
    .map(([state]) => state));
}