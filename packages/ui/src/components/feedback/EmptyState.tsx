// EmptyState — Empty state component for lists, tables, etc.
'use client';

import { forwardRef, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Button } from '../base/Button';
import { Text } from '../primitives/Text';
import { Card } from '../composite/Card';

const emptyStateVariants = tv({
  base: 'flex flex-col items-center justify-center text-center',
  variants: {
    size: {
      sm: 'py-8 px-4',
      md: 'py-12 px-6',
      lg: 'py-16 px-8',
      xl: 'py-24 px-10'
    },
    variant: {
      default: '',
      glass: 'glass rounded-xl',
      card: 'glass-strong rounded-xl'
    }
  },
  defaultVariants: {
    size: 'md',
    variant: 'default'
  }
});

const iconSizes = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32'
} as const;

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: keyof typeof Icons;
  iconSize?: keyof typeof iconSizes;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  variant?: keyof typeof emptyStateVariants.variants.variant;
  size?: keyof typeof emptyStateVariants.variants.size;
  className?: string;
  illustration?: ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({
    className,
    title,
    description,
    icon = 'inbox',
    iconSize = 'md',
    action,
    secondaryAction,
    variant = 'default',
    size = 'md',
    illustration,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(emptyStateVariants({ variant, size }), className)}
        {...props}
      >
        {illustration ? (
          <div className="mb-6 flex-shrink-0">{illustration}</div>
        ) : icon && (
          <div className={cn('mb-6 flex-shrink-0 text-[var(--color-muted-foreground)]', iconSizes[iconSize])}>
            <Icon name={icon} size={iconSize === 'sm' ? 'xl' : iconSize === 'md' ? '2xl' : '3xl'} aria-hidden="true" />
          </div>
        )}
        <Text as="h3" className="text-h3 font-semibold mb-2">
          {title}
        </Text>
        {description && (
          <Text as="p" color="muted" size="body-lg" className="mb-6 max-w-md">
            {description}
          </Text>
        )}
        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
            {secondaryAction && (
              <Button variant="ghost" size="md" className="w-full sm:w-auto">
                {secondaryAction}
              </Button>
            )}
            {action && (
              <Button variant="primary" size="md" className="w-full sm:w-auto">
                {action}
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }
);

EmptyState.displayName = 'EmptyState';

// Pre-built empty states
export function EmptyStateNoResults({
  searchTerm,
  onClearSearch,
  className
}: {
  searchTerm?: string;
  onClearSearch?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon="search"
      title="Nenhum resultado encontrado"
      description={
        searchTerm
          ? `Nenhum resultado para "${searchTerm}". Tente ajustar sua busca.`
          : 'Não encontramos nada com os filtros atuais.'
      }
      action={onClearSearch ? <Button variant="primary" onClick={onClearSearch}>Limpar busca</Button> : undefined}
      className={className}
    />
  );
}

export function EmptyStateNoData({
  title = 'Nenhum dado disponível',
  description = 'Ainda não há dados para exibir.',
  action,
  className
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <EmptyState
      icon="inbox"
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function EmptyStateNoConnection({
  onRetry,
  className
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon="wifiOff"
      title="Sem conexão"
      description="Verifique sua conexão com a internet e tente novamente."
      action={onRetry && <Button variant="primary" onClick={onRetry} leftIcon="refresh">Tentar novamente</Button>}
      className={className}
    />
  );
}

export function EmptyStateError({
  title = 'Algo deu errado',
  description = 'Ocorreu um erro inesperado. Tente novamente mais tarde.',
  onRetry,
  className
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon="alertCircle"
      title={title}
      description={description}
      action={onRetry && <Button variant="primary" onClick={onRetry} leftIcon="refresh">Tentar novamente</Button>}
      secondaryAction={<Button variant="ghost">Suporte</Button>}
      className={className}
    />
  );
}

export function EmptyStatePermission({
  title = 'Acesso negado',
  description = 'Você não tem permissão para acessar este recurso.',
  action,
  className
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <EmptyState
      icon="lock"
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function EmptyStateFirstTime({
  title = 'Comece agora',
  description = 'Ainda não há nada aqui. Crie seu primeiro item para começar.',
  action,
  className
}: {
  title?: string;
  description?: string;
  action: ReactNode;
  className?: string;
}) {
  return (
    <EmptyState
      icon="plusCircle"
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}