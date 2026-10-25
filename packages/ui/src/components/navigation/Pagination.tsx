// Pagination — Pagination component
'use client';

import { forwardRef, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Button } from '../base/Button';
import { Text } from '../primitives/Text';

const paginationVariants = tv({
  base: 'flex items-center justify-center gap-1',
  variants: {
    size: {
      sm: '',
      md: '',
      lg: ''
    }
  },
  defaultVariants: {
    size: 'md'
  }
});

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  size?: keyof typeof paginationVariants.variants.size;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  maxPageButtons?: number;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  size = 'md',
  showFirstLast = true,
  showPrevNext = true,
  maxPageButtons = 5,
  className,
  disabled = false,
  ariaLabel = 'Paginação'
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const buttonSize = size === 'sm' ? 'icon-sm' : size === 'lg' ? 'icon-lg' : 'icon';
  const buttonVariant = 'ghost' as const;

  const pages = getPageNumbers(currentPage, totalPages, maxPageButtons);

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(paginationVariants({ size }), className)}
    >
      <ul className="flex items-center gap-1" role="list">
        {/* First page */}
        {showFirstLast && (
          <li>
            <Button
              variant={buttonVariant}
              size={buttonSize}
              onClick={() => onPageChange(1)}
              disabled={disabled || currentPage === 1}
              aria-label="Primeira página"
              aria-current={currentPage === 1 ? 'page' : undefined}
            >
              <Icon name="chevronsLeft" size={size === 'sm' ? 'xs' : 'sm'} aria-hidden="true" />
            </Button>
          </li>
        )}

        {/* Previous page */}
        {showPrevNext && (
          <li>
            <Button
              variant={buttonVariant}
              size={buttonSize}
              onClick={() => onPageChange(currentPage - 1)}
              disabled={disabled || currentPage === 1}
              aria-label="Página anterior"
            >
              <Icon name="chevronLeft" size={size === 'sm' ? 'xs' : 'sm'} aria-hidden="true" />
            </Button>
          </li>
        )}

        {/* Page numbers */}
        {pages.map((page, index) => (
          <li key={index}>
            {page === 'ellipsis' ? (
              <span className="flex items-center px-2 text-[var(--color-muted-foreground)]" aria-hidden="true">
                …
              </span>
            ) : (
              <Button
                variant={page === currentPage ? 'primary' : buttonVariant}
                size={buttonSize}
                onClick={() => !disabled && onPageChange(page)}
                disabled={disabled}
                aria-label={`Página ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </Button>
            )}
          </li>
        ))}

        {/* Next page */}
        {showPrevNext && (
          <li>
            <Button
              variant={buttonVariant}
              size={buttonSize}
              onClick={() => onPageChange(currentPage + 1)}
              disabled={disabled || currentPage === totalPages}
              aria-label="Próxima página"
            >
              <Icon name="chevronRight" size={size === 'sm' ? 'xs' : 'sm'} aria-hidden="true" />
            </Button>
          </li>
        )}

        {/* Last page */}
        {showFirstLast && (
          <li>
            <Button
              variant={buttonVariant}
              size={buttonSize}
              onClick={() => onPageChange(totalPages)}
              disabled={disabled || currentPage === totalPages}
              aria-label="Última página"
            >
              <Icon name="chevronsRight" size={size === 'sm' ? 'xs' : 'sm'} aria-hidden="true" />
            </Button>
          </li>
        )}
      </ul>

      {/* Page info */}
      <div className="ml-4 flex items-center gap-2 text-body-sm text-[var(--color-muted-foreground)]">
        <Text as="span">Página {currentPage} de {totalPages}</Text>
      </div>
    </nav>
  );
}

function getPageNumbers(currentPage: number, totalPages: number, maxButtons: number): (number | 'ellipsis')[] {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];
  const half = Math.floor(maxButtons / 2);

  let start = Math.max(2, currentPage - half);
  let end = Math.min(totalPages - 1, currentPage + half);

  if (end - start + 1 < maxButtons - 2) {
    if (start === 2) {
      end = Math.min(totalPages - 1, start + maxButtons - 3);
    } else if (end === totalPages - 1) {
      start = Math.max(2, end - maxButtons + 3);
    }
  }

  pages.push(1);

  if (start > 2) {
    pages.push('ellipsis');
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < totalPages - 1) {
    pages.push('ellipsis');
  }

  pages.push(totalPages);

  return pages;
}

// Simple pagination for table footer
export interface SimplePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function SimplePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className
}: SimplePaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className={cn('flex items-center justify-between flex-wrap gap-4', className)}>
      <Text size="body-sm" color="muted">
        Mostrando {start} a {end} de {total} resultados
      </Text>
      <div className="flex items-center gap-3">
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          className="glass-input px-3 py-1.5 text-body-sm rounded-md w-auto"
          aria-label="Itens por página"
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>
              {size} por página
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Página anterior">
            <Icon name="chevronLeft" size="sm" aria-hidden="true" />
          </Button>
          <Text size="body-sm" weight="medium">Página {page} de {totalPages}</Text>
          <Button variant="ghost" size="icon-sm" onClick={() => onPageChange(page + 1)} disabled={page === totalPages} aria-label="Próxima página">
            <Icon name="chevronRight" size="sm" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}