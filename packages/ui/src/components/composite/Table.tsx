// Table — Data table component with sorting, selection
'use client';

import { forwardRef, useState, useMemo, HTMLAttributes, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Checkbox } from '../base/Checkbox';
import { Button } from '../base/Button';
import { Text } from '../primitives/Text';

const tableVariants = tv({
  base: 'w-full border-collapse',
  variants: {
    variant: {
      default: '',
      glass: 'glass-subtle rounded-lg overflow-hidden',
      striped: ''
    },
    size: {
      sm: '',
      md: '',
      lg: ''
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'md'
  }
});

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> extends HTMLAttributes<HTMLTableElement> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  variant?: keyof typeof tableVariants.variants.variant;
  size?: keyof typeof tableVariants.variants.size;
  sortable?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selected: string[]) => void;
  selectedRows?: string[];
  emptyMessage?: string;
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  className?: string;
}

function TableHeader<T>({
  columns,
  sortConfig,
  onSort,
  selectable,
  onSelectAll,
  allSelected,
  size = 'md'
}: {
  columns: Column<T>[];
  sortConfig?: { key: string; direction: 'asc' | 'desc' };
  onSort?: (key: string) => void;
  selectable?: boolean;
  onSelectAll?: (checked: boolean) => void;
  allSelected?: boolean;
  size: keyof typeof tableVariants.variants.size;
}) {
  const sizeClasses = {
    sm: 'px-3 py-2 text-body-xs',
    md: 'px-4 py-3 text-body-sm',
    lg: 'px-6 py-4 text-body'
  };

  return (
    <thead className="bg-[var(--color-muted)] border-b border-[var(--color-border)]">
      <tr>
        {selectable && (
          <th className={cn(sizeClasses[size], 'text-center')}>
            <Checkbox
              checked={allSelected}
              onChange={e => onSelectAll?.(e.target.checked)}
              aria-label="Selecionar todas as linhas"
            />
          </th>
        )}
        {columns.map(column => (
          <th
            key={column.key}
            className={cn(
              sizeClasses[size],
              'font-semibold text-[var(--color-foreground)]',
              'text-left',
              column.align === 'center' && 'text-center',
              column.align === 'right' && 'text-right',
              column.sortable && 'cursor-pointer select-none hover:text-[var(--color-primary)]',
              column.headerClassName
            )}
            style={{ width: column.width }}
            onClick={column.sortable ? () => onSort?.(column.key) : undefined}
            aria-sort={
              sortConfig?.key === column.key
                ? sortConfig.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <div className="flex items-center gap-1.5">
              {column.header}
              {column.sortable && sortConfig?.key === column.key && (
                <Icon
                  name={sortConfig.direction === 'asc' ? 'chevronUp' : 'chevronDown'}
                  size="xs"
                  aria-hidden="true"
                />
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}

function TableBody<T>({
  columns,
  data,
  keyExtractor,
  sortConfig,
  selectable,
  selectedRows,
  onSelectRow,
  size = 'md',
  emptyMessage = 'Nenhum dado encontrado',
  renderRow
}: {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' };
  selectable?: boolean;
  selectedRows?: string[];
  onSelectRow?: (key: string, checked: boolean) => void;
  size: keyof typeof tableVariants.variants.size;
  emptyMessage: string;
  renderRow?: (row: T, index: number, selected: boolean) => ReactNode;
}) {
  const sizeClasses = {
    sm: 'px-3 py-2 text-body-sm',
    md: 'px-4 py-3 text-body',
    lg: 'px-6 py-4 text-body-lg'
  };

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortConfig.key];
      const bVal = (b as any)[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  if (sortedData.length === 0) {
    const colSpan = columns.length + (selectable ? 1 : 0);
    return (
      <tbody>
        <tr>
          <td colSpan={colSpan} className={cn(sizeClasses[size], 'text-center text-[var(--color-muted-foreground)] py-8')}>
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {sortedData.map((row, index) => {
        const rowKey = keyExtractor(row);
        const isSelected = selectedRows?.includes(rowKey);
        return (
          <tr
            key={rowKey}
            className={cn(
              'border-b border-[var(--color-border)]/50',
              'hover:bg-[var(--color-muted)]/50',
              isSelected && 'bg-[var(--color-primary-light)]/50',
              'transition-colors duration-fast'
            )}
          >
            {selectable && (
              <td className={cn(sizeClasses[size], 'text-center')}>
                <Checkbox
                  checked={isSelected}
                  onChange={e => onSelectRow?.(rowKey, e.target.checked)}
                  aria-label={`Selecionar linha ${index + 1}`}
                />
              </td>
            )}
            {columns.map(column => (
              <td
                key={column.key}
                className={cn(
                  sizeClasses[size],
                  'text-[var(--color-foreground)]',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.className
                )}
              >
                {column.render ? column.render(row, index) : (row as any)[column.key]}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
}

function TableFooter<T>({
  pagination
}: {
  pagination?: TableProps<T>['pagination'];
}) {
  if (!pagination) return null;

  const { page, pageSize, total, onPageChange, onPageSizeChange } = pagination;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <tfoot>
      <tr>
        <td colSpan={99} className="px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
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
                {[10, 25, 50, 100].map(size => (
                  <option key={size} value={size}>
                    {size} por página
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  aria-label="Página anterior"
                >
                  <Icon name="chevronLeft" size="sm" aria-hidden="true" />
                </Button>
                <Text size="body-sm" weight="medium">
                  Página {page} de {totalPages}
                </Text>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page === totalPages}
                  aria-label="Próxima página"
                >
                  <Icon name="chevronRight" size="sm" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </tfoot>
  );
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  variant = 'default',
  size = 'md',
  sortable = false,
  selectable = false,
  onSelectionChange,
  selectedRows = [],
  emptyMessage = 'Nenhum dado encontrado',
  loading = false,
  pagination,
  className,
  ...props
}: TableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | undefined>(undefined);
  const [localSelectedRows, setLocalSelectedRows] = useState<string[]>(selectedRows);

  const handleSort = (key: string) => {
    if (!sortable) return;
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    const keys = data.map(keyExtractor);
    const newSelection = checked ? keys : [];
    setLocalSelectedRows(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    const newSelection = checked
      ? [...localSelectedRows, key]
      : localSelectedRows.filter(k => k !== key);
    setLocalSelectedRows(newSelection);
    onSelectionChange?.(newSelection);
  };

  const allSelected = data.length > 0 && data.every(row => localSelectedRows.includes(keyExtractor(row)));

  const tableClass = cn(
    tableVariants({ variant, size }),
    variant === 'glass' && 'overflow-hidden',
    className
  );

  return (
    <div className="overflow-x-auto">
      <table className={tableClass} {...props}>
        <TableHeader
          columns={columns}
          sortConfig={sortConfig}
          onSort={handleSort}
          selectable={selectable}
          onSelectAll={handleSelectAll}
          allSelected={allSelected}
          size={size}
        />
        <TableBody
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          sortConfig={sortConfig}
          selectable={selectable}
          selectedRows={localSelectedRows}
          onSelectRow={handleSelectRow}
          size={size}
          emptyMessage={emptyMessage}
        />
        {pagination && <TableFooter pagination={pagination} />}
      </table>
      {loading && (
        <div className="absolute inset-0 glass-subtle flex items-center justify-center z-10">
          <Icon name="loader" size="xl" animated aria-hidden="true" className="text-[var(--color-primary)]" />
        </div>
      )}
    </div>
  );
}