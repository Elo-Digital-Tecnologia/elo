// BillSummary — Bill summary component for cashier/checkout
'use client';

import { forwardRef, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Button } from '../base/Button';
import { Badge } from '../base/Badge';
import { Text } from '../primitives/Text';
import { Card } from '../composite/Card';
import { Input } from '../base/Input';
import { Select } from '../base/Select';
import { RadioGroup } from '../base/RadioGroup';

const billSummaryVariants = tv({
  base: 'glass-strong',
  variants: {
    variant: {
      default: '',
      compact: '',
      detailed: ''
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

export interface BillItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  options?: Array<{ name: string; value: string }>;
}

export interface BillSummaryProps {
  tableName: string;
  tableNumber?: string;
  items: BillItem[];
  subtotal: number;
  serviceCharge?: number;
  serviceChargePercentage?: number;
  discount?: number;
  total: number;
  splitType?: 'none' | 'equal' | 'by-item';
  splitCount?: number;
  onSplitChange?: (type: 'none' | 'equal' | 'by-item', count?: number) => void;
  onServiceChargeToggle?: (enabled: boolean) => void;
  onDiscountChange?: (value: number) => void;
  onPrint?: () => void;
  onClose?: () => void;
  onPay?: () => void;
  serviceChargeEnabled?: boolean;
  className?: string;
}

const formatPrice = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const BillSummary = forwardRef<HTMLDivElement, BillSummaryProps>(
  ({
    className,
    tableName,
    tableNumber,
    items,
    subtotal,
    serviceCharge = 0,
    serviceChargePercentage = 10,
    discount = 0,
    total,
    splitType = 'none',
    splitCount = 1,
    onSplitChange,
    onServiceChargeToggle,
    onDiscountChange,
    onPrint,
    onClose,
    onPay,
    serviceChargeEnabled = true,
    ...props
  }, ref) => {
    const serviceChargeValue = serviceChargeEnabled ? serviceCharge : 0;
    const calculatedTotal = subtotal + serviceChargeValue - discount;

    return (
      <Card
        ref={ref}
        variant="glass-strong"
        padding="lg"
        className={cn(billSummaryVariants({ variant: 'detailed' }), className)}
        {...props}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Text as="h2" className="text-h3 font-semibold">
                {tableName}
                {tableNumber && <Text as="span" color="muted" size="body-sm">#{tableNumber}</Text>}
              </Text>
              <Badge variant="primary" size="sm">
                Conta
              </Badge>
            </div>
            <Text as="p" color="muted" size="body-sm" className="mt-1">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            {onPrint && (
              <Button variant="ghost" size="icon" onClick={onPrint} aria-label="Imprimir conta">
                <Icon name="printer" size="md" aria-hidden="true" />
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
                <Icon name="x" size="md" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto pr-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-3 glass-subtle rounded-lg">
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold text-body-sm">
                {item.quantity}
              </div>
              <div className="flex-1 min-w-0">
                <Text weight="medium" className="truncate">{item.name}</Text>
                {item.options && item.options.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
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
              </div>
              <Text as="span" className="text-body font-semibold whitespace-nowrap text-[var(--color-foreground)]">
                {formatPrice(item.totalPrice)}
              </Text>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-3 mb-6 p-4 glass-subtle rounded-lg border border-[var(--glass-border)]">
          <div className="flex items-center justify-between">
            <Text size="body-sm" color="muted">Subtotal ({items.length} itens)</Text>
            <Text weight="semibold">{formatPrice(subtotal)}</Text>
          </div>

          {serviceChargeEnabled && serviceChargePercentage > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Text size="body-sm" color="muted">Taxa de serviço ({serviceChargePercentage}%)</Text>
                {onServiceChargeToggle && (
                  <input
                    type="checkbox"
                    checked={serviceChargeEnabled}
                    onChange={e => onServiceChargeToggle?.(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--color-border)] checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)]"
                    aria-label="Aplicar taxa de serviço"
                  />
                )}
              </div>
              <Text weight="semibold" color={serviceChargeEnabled ? 'default' : 'muted'}>
                {formatPrice(serviceChargeValue)}
              </Text>
            </div>
          )}

          {discount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Text size="body-sm" color="muted">Desconto</Text>
                {onDiscountChange && (
                  <Input
                    type="number"
                    min={0}
                    max={subtotal}
                    step={0.01}
                    value={discount}
                    onChange={e => onDiscountChange?.(parseFloat(e.target.value) || 0)}
                    className="w-24"
                    size="sm"
                  />
                )}
              </div>
              <Text weight="semibold" color="destructive">
                -{formatPrice(discount)}
              </Text>
            </div>
          )}

          <div className="border-t border-[var(--glass-border)] pt-3">
            <div className="flex items-center justify-between">
              <Text className="text-h5 font-bold">Total</Text>
              <Text className="text-h4 font-bold text-[var(--color-primary)]">
                {formatPrice(calculatedTotal)}
              </Text>
            </div>
          </div>
        </div>

        {/* Split options */}
        <div className="mb-6 p-4 glass-subtle rounded-lg border border-[var(--glass-border)]">
          <Text as="h4" className="text-label font-semibold mb-3">Dividir conta</Text>
          <RadioGroup
            name="split-type"
            value={splitType}
            onChange={value => onSplitChange?.(value as 'none' | 'equal' | 'by-item', splitCount)}
            direction="horizontal"
            options={[
              { value: 'none', label: 'Não dividir', description: 'Uma única conta' },
              { value: 'equal', label: 'Dividir igualmente', description: `Por ${splitCount} pessoa${splitCount !== 1 ? 's' : ''}` },
              { value: 'by-item', label: 'Por item', description: 'Cada um paga o que consumiu' }
            ]}
          />
          {(splitType === 'equal' || splitType === 'by-item') && (
            <div className="mt-3 flex items-center gap-3">
              <Text size="body-sm" color="muted">Pessoas:</Text>
              <Select
                value={splitCount}
                onChange={e => onSplitChange?.(splitType, parseInt(e.target.value))}
                options={Array.from({ length: 20 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                className="w-24"
              />
            </div>
          )}
          {splitType === 'equal' && splitCount > 1 && (
            <Text as="p" size="body-sm" color="primary" className="mt-2">
              Cada pessoa paga: {formatPrice(calculatedTotal / splitCount)}
            </Text>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="lg" fullWidth onClick={onPrint} leftIcon="printer">
            Imprimir conta
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={onPay} leftIcon="creditCard">
            Finalizar pagamento ({formatPrice(calculatedTotal)})
          </Button>
        </div>
      </Card>
    );
    }
);

BillSummary.displayName = 'BillSummary';