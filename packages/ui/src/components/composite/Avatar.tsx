// Avatar — User/profile avatar component
'use client';

import { forwardRef, HTMLAttributes, useState } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Text } from '../primitives/Text';

const avatarVariants = tv({
  base: 'relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[var(--color-muted)] flex-shrink-0',
  variants: {
    size: {
      xs: 'w-6 h-6 text-body-xs',
      sm: 'w-8 h-8 text-body-sm',
      md: 'w-10 h-10 text-body',
      lg: 'w-12 h-12 text-body-lg',
      xl: 'w-16 h-16 text-h5',
      '2xl': 'w-20 h-20 text-h3',
      '3xl': 'w-24 h-24 text-h2'
    },
    shape: {
      circle: 'rounded-full',
      square: 'rounded-lg'
    }
  },
  defaultVariants: {
    size: 'md',
    shape: 'circle'
  }
});

const fallbackVariants = tv({
  base: 'flex items-center justify-center w-full h-full font-medium text-[var(--color-muted-foreground)]',
  variants: {
    size: {
      xs: 'text-body-xs',
      sm: 'text-body-sm',
      md: 'text-body',
      lg: 'text-body-lg',
      xl: 'text-h5',
      '2xl': 'text-h3',
      '3xl': 'text-h2'
    }
  },
  defaultVariants: {
    size: 'md'
  }
});

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: keyof typeof avatarVariants.variants.size;
  shape?: keyof typeof avatarVariants.variants.shape;
  status?: 'online' | 'offline' | 'busy' | 'away';
  statusPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({
    className,
    src,
    alt,
    name,
    size = 'md',
    shape = 'circle',
    status,
    statusPosition = 'bottom-right',
    ...props
  }, ref) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    const showFallback = !src || imageError || imageLoading;

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    const statusColors = {
      online: 'bg-[var(--color-status-success)]',
      offline: 'bg-[var(--color-muted-foreground)]',
      busy: 'bg-[var(--color-status-error)]',
      away: 'bg-[var(--color-status-warning)]'
    };

    const statusPositions = {
      'bottom-right': 'bottom-0 right-0',
      'bottom-left': 'bottom-0 left-0',
      'top-right': 'top-0 right-0',
      'top-left': 'top-0 left-0'
    };

    const statusSizes = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-3.5 h-3.5',
      '2xl': 'w-4 h-4',
      '3xl': 'w-5 h-5'
    };

    return (
      <div
        ref={ref}
        className={cn(avatarVariants({ size, shape }), className)}
        {...props}
      >
        {src && !imageError && !imageLoading ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            onLoad={() => setImageLoading(false)}
          />
        ) : (
          <div className={cn(fallbackVariants({ size }), 'w-full h-full')}>
            {name ? getInitials(name) : <Icon name="user" size={size === 'xs' ? 'xs' : size === 'sm' ? 'sm' : 'md'} aria-hidden="true" />}
          </div>
        )}
        {status && (
          <span
            className={cn(
              'absolute rounded-full border-2 border-[var(--color-background)]',
              statusColors[status],
              statusSizes[size],
              statusPositions[statusPosition]
            )}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

// Avatar group component
export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  avatars: Array<{
    src?: string;
    alt?: string;
    name?: string;
  }>;
  max?: number;
  size?: keyof typeof avatarVariants.variants.size;
  className?: string;
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, avatars, max = 5, size = 'md', ...props }, ref) => {
    const visibleAvatars = avatars.slice(0, max);
    const remainingCount = avatars.length - max;

    const overlapStyles = {
      xs: '-ml-1.5',
      sm: '-ml-2',
      md: '-ml-2.5',
      lg: '-ml-3',
      xl: '-ml-4',
      '2xl': '-ml-5',
      '3xl': '-ml-6'
    };

    return (
      <div ref={ref} className={cn('flex items-center', className)} {...props}>
        {visibleAvatars.map((avatar, index) => (
          <Avatar
            key={avatar.name || avatar.src || index}
            src={avatar.src}
            alt={avatar.alt}
            name={avatar.name}
            size={size}
            className={cn(index > 0 && overlapStyles[size])}
          />
        ))}
        {remainingCount > 0 && (
          <Avatar
            name={`${remainingCount}+`}
            size={size}
            className={cn(overlapStyles[size], 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]')}
          />
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';