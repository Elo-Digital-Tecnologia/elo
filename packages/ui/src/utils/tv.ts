// tailwind-variants helper
import { tv, type VariantProps } from 'tailwind-variants';

export { tv, type VariantProps };

// Default tv config for consistent component APIs
const twMergeConfig = {
  twMerge: true,
  twMergeConfig: {
    extend: {
      classGroups: {
        'font-size': ['text-display-xl', 'text-display-lg', 'text-display-md', 'text-display-sm', 'text-display-xs',
                      'text-h1', 'text-h2', 'text-h3', 'text-h4', 'text-h5', 'text-h6',
                      'text-body-lg', 'text-body', 'text-body-sm', 'text-body-xs',
                      'text-label', 'text-label-sm',
                      'text-button', 'text-button-sm', 'text-button-lg',
                      'text-data-lg', 'text-data', 'text-data-sm',
                      'text-caption', 'text-overline'],
        'font-weight': ['font-thin', 'font-extralight', 'font-light', 'font-normal',
                        'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'],
        'font-family': ['font-display', 'font-body', 'font-mono']
      }
    }
  }
} as const;

export function createVariants<T extends Parameters<typeof tv>[0]>(options: T) {
  return tv(options, twMergeConfig);
}