// ProductCard — Menu product card component
'use client';

import { forwardRef, ReactNode, useState } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Button } from '../base/Button';
import { Badge } from '../base/Badge';
import { Text } from '../primitives/Text';
import { Card } from '../composite/Card';

const productCardVariants = tv({
  base: 'glass group relative overflow-hidden',
  variants: {
    variant: {
      default: '',
      compact: '',
      detailed: ''
    },
    available: {
      true: '',
      false: 'opacity-50'
    }
  },
  defaultVariants: {
    variant: 'default',
    available: true
  }
});

export interface ProductOption {
  id: string;
  name: string;
  type: 'single' | 'multiple' | 'boolean';
  required: boolean;
  choices: Array<{
    id: string;
    name: string;
    price?: number;
  }>;
}

export interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  category?: string;
  available: boolean;
  options?: ProductOption[];
  tags?: string[];
  variant?: keyof typeof productCardVariants.variants.variant;
  onAddToCart?: (product: ProductCardProps, selectedOptions: Record<string, string[]>) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
  className?: string;
}

export const ProductCard = forwardRef<HTMLDivElement, ProductCardProps>(
  ({
    className,
    id,
    name,
    description,
    price,
    image,
    category,
    available,
    options,
    tags,
    variant = 'default',
    onAddToCart,
    onEdit,
    onDelete,
    showActions = false,
    ...props
  }, ref) => {
    const [showOptions, setShowOptions] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});

    const formatPrice = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    const handleOptionChange = (optionId: string, choiceId: string, isMultiple: boolean) => {
      setSelectedOptions(prev => {
        const current = prev[optionId] || [];
        if (isMultiple) {
          const exists = current.includes(choiceId);
          return {
            ...prev,
            [optionId]: exists ? current.filter(id => id !== choiceId) : [...current, choiceId]
          };
        }
        return {
          ...prev,
          [optionId]: current.includes(choiceId) ? [] : [choiceId]
        };
      });
    };

    const handleAddToCart = () => {
      if (onAddToCart) {
        onAddToCart(
          { id, name, description, price, image, category, available, options, tags, variant, onAddToCart: undefined, onEdit: undefined, onDelete: undefined, showActions: false },
          selectedOptions
        );
      }
      setShowOptions(false);
    };

    // Check if all required options are selected
    const allRequiredSelected = options?.every(opt => {
      if (!opt.required) return true;
      const selected = selectedOptions[opt.id] || [];
      return opt.type === 'boolean' ? selected.length > 0 : selected.length > 0;
    }) ?? true;

    return (
      <Card
        ref={ref}
        variant="glass"
        padding="none"
        className={cn(
          productCardVariants({ variant, available }),
          className
        )}
        {...props}
      >
        {/* Image */}
        {image && (
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {!available && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Badge variant="error" size="lg">
                  Indisponível
                </Badge>
              </div>
            )}
            {tags && tags.length > 0 && (
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="primary" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Text as="h4" className="text-h5 font-semibold truncate">
                {name}
              </Text>
              {category && (
                <Text as="span" size="body-sm" color="muted" className="mt-0.5">
                  {category}
                </Text>
              )}
            </div>
            <Text as="span" className="text-h4 font-bold text-[var(--color-primary)] whitespace-nowrap">
              {formatPrice(price)}
            </Text>
          </div>

          {description && (
            <Text as="p" size="body-sm" color="muted" className="line-clamp-2">
              {description}
            </Text>
          )}

          {/* Options preview */}
          {options && options.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[var(--glass-border)]">
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                className="justify-start"
                onClick={() => setShowOptions(!showOptions)}
                leftIcon={showOptions ? 'chevronUp' : 'chevronDown'}
              >
                {options.length} opção{options.length !== 1 ? 'ões' : ''} disponível{options.length !== 1 ? 'eis' : ''}
              </Button>

              {showOptions && (
                <div className="space-y-3 animate-fade-in-down animate-ease-out animate-fill-forwards">
                  {options.map(option => (
                    <div key={option.id} className="space-y-2 p-3 glass-subtle rounded-lg">
                      <div className="flex items-center justify-between">
                        <Text weight="medium" size="body-sm">{option.name}</Text>
                        {option.required && (
                          <Badge variant="primary" size="xs">Obrigatório</Badge>
                        )}
                      </div>
                      <Text size="body-xs" color="muted">
                        {option.type === 'single' ? 'Escolha uma' : option.type === 'multiple' ? 'Escolha várias' : 'Sim/Não'}
                      </Text>
                      <div className="flex flex-wrap gap-2">
                        {option.choices.map(choice => {
                          const isSelected = selectedOptions[option.id]?.includes(choice.id);
                          return (
                            <button
                              key={choice.id}
                              type="button"
                              onClick={() => handleOptionChange(option.id, choice.id, option.type === 'multiple')}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-body-sm font-medium transition-all duration-fast',
                                isSelected
                                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                                  : 'glass-subtle text-[var(--glass-text)] hover:bg-[var(--glass-bg-hover)]'
                              )}
                            >
                              {choice.name}
                              {choice.price && choice.price > 0 && (
                                <Text as="span" className="ml-1" size="body-xs">
                                  (+{formatPrice(choice.price)})
                                </Text>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--glass-border)]">
            {onAddToCart && (
              <Button
                variant="primary"
                fullWidth
                onClick={handleAddToCart}
                disabled={!available || !allRequiredSelected}
                leftIcon={available ? 'plus' : 'xCircle'}
              >
                {available ? (showOptions && options ? 'Adicionar com opções' : 'Adicionar') : 'Indisponível'}
              </Button>
            )}
            {showActions && (
                <>
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
                </>
              )}
          </div>
        </div>
      </Card>
    );
  }
);

ProductCard.displayName = 'ProductCard';

// ProductCard grid
export interface ProductCardGridProps {
  products: ProductCardProps[];
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProductCardGrid({
  products,
  columns = 3,
  gap = 'md',
  className
}: ProductCardGridProps) {
  const gapClasses = { sm: 'gap-3', md: 'gap-4', lg: 'gap-6' };
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)} role="list">
      {products.map((product, index) => (
        <ProductCard key={product.id || index} {...product} />
      ))}
    </div>
  );
}