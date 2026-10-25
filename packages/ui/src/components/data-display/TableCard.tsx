// TableCard — Restaurant table card component
'use client';

import { forwardRef, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Button } from '../base/Button';
import { Badge } from '../base/Badge';
import { Text } from '../primitives/Text';
import { Card } from '../composite/Card';

const tableCardVariants = tv({
  base: 'glass-strong',
  variants: {
    status: {
      free: 'border-l-4 border-[var(--color-status-success)]',
      occupied: 'border-l-4 border-[var(--color-primary)]',
      reserved: 'border-l-4 border-[var(--color-accent)]',
      cleaning: 'border-l-4 border-[var(--color-muted-foreground)]',
      maintenance: 'border-l-4 border-[var(--color-destructive)] opacity-75'
    },
    size: {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    }
  },
  defaultVariants: {
    status: 'free',
    size: 'md'
  }
});

const statusConfig = {
  free: { label: 'Livre', color: 'success', icon: 'checkCircle' },
  occupied: { label: 'Ocupada', color: 'primary', icon: 'users' },
  reserved: { label: 'Reservada', color: 'warning', icon: 'bookmark' },
  cleaning: { label: 'Limpando', color: 'default', icon: 'sparkles' },
  maintenance: { label: 'Manutenção', color: 'error', icon: 'tool' }
} as const;

export interface TableCardProps {
  id: string;
  name: string;
  number?: string;
  capacity: number;
  status: keyof typeof statusConfig;
  currentOrder?: {
    id: string;
    itemCount: number;
    total: number;
    status: string;
  };
  qrCode?: string;
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrintQR?: () => void;
  showActions?: boolean;
  variant?: keyof typeof tableCardVariants.variants.size;
  className?: string;
}

export const TableCard = forwardRef<HTMLDivElement, TableCardProps>(
  ({
    className,
    id,
    name,
    number,
    capacity,
    status,
    currentOrder,
    qrCode,
    onOpen,
    onEdit,
    onDelete,
    onPrintQR,
    showActions = true,
    variant = 'md',
    ...props
  }, ref) => {
    const statusInfo = statusConfig[status];

    return (
      <Card
        ref={ref}
        variant="glass-strong"
        padding={variant}
        className={cn(
          tableCardVariants({ status, size: variant }),
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <Text as="h3" className="text-h4 font-semibold">
                {name}
                {number && <Text as="span" color="muted" size="body-sm">#{number}</Text>}
              </Text>
              <Badge variant={statusInfo.color as any} dot>
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-body-sm text-[var(--color-muted-foreground)]">
              <span className="flex items-center gap-1">
                <Icon name={statusInfo.icon} size="sm" aria-hidden="true" />
                Capacidade: {capacity} pessoa{capacity !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          {showActions && (
            <div className="flex items-center gap-1">
              {qrCode && onPrintQR && (
                <Button variant="ghost" size="icon" onClick={onPrintQR} aria-label="Imprimir QR Code">
                  <Icon name="printer" size="md" aria-hidden="true" />
                </Button>
              )}
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar">
                  <Icon name="edit" size="md" aria-hidden="true" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Excluir" className="text-[var(--color-destructive)] hover:text-[var(--color-destructive)]">
                  <Icon name="trash" size="md" aria-hidden="true" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Current Order */}
        {currentOrder && (
          <div className="mb-4 p-3 glass-subtle rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon name="receipt" size="md" className="text-[var(--color-primary)]" aria-hidden="true" />
                <div>
                  <Text weight="medium" size="body-sm">Comanda ativa</Text>
                  <Text size="body-xs" color="muted">
                    {currentOrder.itemCount} item{currentOrder.itemCount !== 1 ? 's' : ''} • 
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentOrder.total)}
                  </Text>
                </div>
              </div>
              <Badge variant={currentOrder.status === 'ready' ? 'success' : currentOrder.status === 'preparing' ? 'warning' : 'default'} size="sm">
                {currentOrder.status}
              </Badge>
            </div>
            {onOpen && (
              <Button variant="primary" size="sm" fullWidth className="mt-2" onClick={onOpen} leftIcon="eye">
                Ver comanda
              </Button>
            )}
          </div>
        )}

        {/* Empty state */}
        {!currentOrder && status === 'occupied' && (
          <div className="mb-4 p-3 glass-subtle rounded-lg text-center">
            <Icon name="alertCircle" size="md" className="text-[var(--color-accent)] mx-auto mb-2" aria-hidden="true" />
            <Text size="body-sm" color="muted">Mesa ocupada mas sem comanda aberta</Text>
            {onOpen && (
              <Button variant="primary" size="sm" className="mt-2" onClick={onOpen} leftIcon="plus">
                Abrir comanda
              </Button>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--glass-border)]">
            {status === 'free' && onOpen && (
              <Button variant="primary" size="sm" fullWidth onClick={onOpen} leftIcon="users">
                Ocupar mesa
              </Button>
            )}
            {status === 'occupied' && currentOrder && onOpen && (
              <Button variant="primary" size="sm" fullWidth onClick={onOpen} leftIcon="eye">
                Ver comanda
              </Button>
            )}
            {status === 'occupied' && !currentOrder && onOpen && (
              <Button variant="primary" size="sm" fullWidth onClick={onOpen} leftIcon="plus">
                Abrir comanda
              </Button>
            )}
            {status === 'reserved' && (
              <Button variant="ghost" size="sm" fullWidth disabled>
                Reservada
              </Button>
            )}
            {status === 'cleaning' && (
              <Button variant="ghost" size="sm" fullWidth disabled>
                <Icon name="sparkles" size="sm" aria-hidden="true" />
                Em limpeza
              </Button>
            )}
            {status === 'maintenance' && (
              <Button variant="ghost" size="sm" fullWidth disabled className="text-[var(--color-destructive)]">
                <Icon name="tool" size="sm" aria-hidden="true" />
                Manutenção
              </Button>
            )}
          </div>
        )}
      </Card>
    );
  }
);

TableCard.displayName = 'TableCard';

// TableCard grid
export interface TableCardGridProps {
  tables: TableCardProps[];
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TableCardGrid({
  tables,
  columns = 4,
  gap = 'md',
  className
}: TableCardGridProps) {
  const gapClasses = { sm: 'gap-3', md: 'gap-4', lg: 'gap-6' };
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
  };

  return (
    <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)} role="list">
      {tables.map((table, index) => (
        <TableCard key={table.id || index} {...table} />
      ))}
    </div>
  );
}