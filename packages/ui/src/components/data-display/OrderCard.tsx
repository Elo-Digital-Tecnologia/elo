// OrderCard — Kitchen order card component
'use client';

import { forwardRef, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Button } from '../base/Button';
import { Badge } from '../base/Badge';
import { Text } from '../primitives/Text';
import { Card } from '../composite/Card';

const orderCardVariants = tv({
  base: 'glass-strong',
  variants: {
    status: {
      sent: 'border-l-4 border-[var(--color-primary)]',
      received: 'border-l-4 border-[var(--color-accent)]',
      preparing: 'border-l-4 border-[var(--color-status-warning)]',
      ready: 'border-l-4 border-[var(--color-status-success)]',
      cancelled: 'border-l-4 border-[var(--color-destructive)] opacity-75',
      returned: 'border-l-4 border-[var(--color-status-error)] opacity-75'
    },
    priority: {
      normal: '',
      high: 'ring-2 ring-[var(--color-destructive)]',
      urgent: 'ring-2 ring-[var(--color-destructive)] animate-pulse-soft'
    }
  },
  defaultVariants: {
    status: 'sent',
    priority: 'normal'
  }
});

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
  options?: Array<{ name: string; value: string }>;
  status?: 'pending' | 'preparing' | 'ready';
}

export interface OrderCardProps {
  orderId: string;
  tableName: string;
  tableNumber?: string;
  items: OrderItem[];
  status: 'sent' | 'received' | 'preparing' | 'ready' | 'cancelled' | 'returned';
  priority?: 'normal' | 'high' | 'urgent';
  timestamp: Date | string;
  onStatusChange?: (newStatus: OrderCardProps['status']) => void;
  onViewDetails?: () => void;
  onCancel?: (reason: string) => void;
  showActions?: boolean;
  className?: string;
}

const statusConfig = {
  sent: { label: 'Enviado', color: 'primary', icon: 'send' },
  received: { label: 'Recebido', color: 'warning', icon: 'checkCircle' },
  preparing: { label: 'Em preparo', color: 'warning', icon: 'loader' },
  ready: { label: 'Pronto', color: 'success', icon: 'checkCheck' },
  cancelled: { label: 'Cancelado', color: 'error', icon: 'xCircle' },
  returned: { label: 'Devolvido', color: 'error', icon: 'rotateCcw' }
} as const;

export const OrderCard = forwardRef<HTMLDivElement, OrderCardProps>(
    ({
        className,
        orderId,
        tableName,
        tableNumber,
        items,
        status,
        priority = 'normal',
        timestamp,
        onStatusChange,
        onViewDetails,
        onCancel,
        showActions = true,
        ...props
    }, ref) => {
        const statusInfo = statusConfig[status];
        const date = new Date(timestamp);
        const timeString = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dateString = date.toLocaleDateString('pt-BR');

        return (
            <Card
                ref={ref}
                variant="glass-strong"
                padding="md"
                className={cn(
                    orderCardVariants({ status, priority }),
                    className
                )}
                {...props}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Text as="h3" className="text-h4 font-semibold">
                                {tableName}
                                {tableNumber && <Text as="span" color="muted" size="body-sm">#{tableNumber}</Text>}
                            </Text>
                            <Badge variant={statusInfo.color as any} dot>
                                {statusInfo.label}
                            </Badge>
                            {priority !== 'normal' && (
                                <Badge variant="error" size="xs">
                                    {priority === 'urgent' ? 'URGENTE' : 'ALTA PRIORIDADE'}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-body-sm text-[var(--color-muted-foreground)]">
                            <span className="flex items-center gap-1">
                                <Icon name="clock" size="sm" aria-hidden="true" />
                                {timeString}
                            </span>
                            <span className="flex items-center gap-1">
                                <Icon name="calendar" size="sm" aria-hidden="true" />
                                {dateString}
                            </span>
                            <span className="flex items-center gap-1">
                                <Icon name="package" size="sm" aria-hidden="true" />
                                {items.length} item{items.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                    {onViewDetails && (
                        <Button variant="ghost" size="icon" onClick={onViewDetails} aria-label="Ver detalhes">
                            <Icon name="eye" size="md" aria-hidden="true" />
                        </Button>
                    )}
                </div>

                {/* Items */}
                <div className="space-y-3 mb-4">
                    {items.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 glass-subtle rounded-lg">
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold text-body-sm">
                                {item.quantity}
                            </div>
                            <div className="flex-1 min-w-0">
                                <Text weight="medium" className="truncate">{item.name}</Text>
                                {item.options && item.options.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {item.options.map((opt, optIndex) => (
                                            <Badge key={optIndex} variant="outline" size="xs">
                                                {opt.name}: {opt.value}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                {item.notes && (
                                    <Text as="p" size="body-xs" color="muted" className="mt-1 italic">
                                        {item.notes}
                                    </Text>
                                )}
                                {item.status && item.status !== 'pending' && (
                                    <Badge key="status" variant={item.status === 'ready' ? 'success' : 'warning'} size="xs">
                                        {item.status === 'preparing' ? 'Preparando' : 'Pronto'}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                {showActions && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--glass-border)]">
                        {status !== 'ready' && status !== 'cancelled' && status !== 'returned' && (
                            <>
                                {status === 'sent' && onStatusChange && (
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => onStatusChange('received')}
                                        leftIcon="checkCircle"
                                    >
                                        Receber
                                    </Button>
                                )}
                                {status === 'received' && onStatusChange && (
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => onStatusChange('preparing')}
                                        leftIcon="loader"
                                    >
                                        Iniciar preparo
                                    </Button>
                                )}
                                {status === 'preparing' && onStatusChange && (
                                    <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() => onStatusChange('ready')}
                                        leftIcon="checkCheck"
                                    >
                                        Marcar pronto
                                    </Button>
                                )}
                                {(status === 'sent' || status === 'received' || status === 'preparing') && onCancel && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            const reason = prompt('Motivo do cancelamento (obrigatório):');
                                            if (reason) onCancel(reason);
                                        }}
                                        leftIcon="xCircle"
                                    >
                                        Cancelar
                                    </Button>
                                )}
                            </>
                        )}
                        {status === 'ready' && (
                            <Button variant="primary" size="sm" leftIcon="checkCheck" disabled>
                                Pronto para entrega
                            </Button>
                        )}
                        {status === 'cancelled' && (
                            <Button variant="ghost" size="sm" disabled>
                                <Icon name="xCircle" size="sm" aria-hidden="true" />
                                Cancelado
                            </Button>
                        )}
                        {status === 'returned' && (
                            <Button variant="ghost" size="sm" leftIcon="rotateCcw" disabled>
                                Devolvido
                            </Button>
                        )}
                    </div>
                )}
            </Card>
        );
    }
);

OrderCard.displayName = 'OrderCard';
