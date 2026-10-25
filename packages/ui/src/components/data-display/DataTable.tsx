// DataTable — Advanced data table with sorting, filtering, pagination
'use client';

import { forwardRef, useState, useMemo, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Button } from '../base/Button';
import { Input } from '../base/Input';
import { Select } from '../base/Select';
import { Badge } from '../base/Badge';
import { Skeleton } from '../composite/Skeleton';
import { Pagination } from '../navigation/Pagination';
import { Text } from '../primitives/Text';
import { Table } from '../composite/Table';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: Array<{ value: string; label: string }>;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selected: string[]) => void;
  selectedRows?: string[];
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageSizeOptions?: number[];
  };
  rowActions?: Array<{
    label: string;
    onClick: (row: T) => void;
    icon?: keyof typeof Icons;
    variant?: 'primary' | 'destructive' | 'ghost';
    disabled?: (row: T) => boolean;
  }>;
  className?: string;
}

function DataTableToolbar<T>({
  columns,
  filters,
  onFilterChange,
  onClearFilters,
  searchValue,
  onSearchChange,
  selectedCount,
  onSelectionClear
}: {
  columns: DataTableColumn<T>[];
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedCount: number;
  onSelectionClear: () => void;
}) {
  const filterableColumns = columns.filter(c => c.filterable);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 p-4 glass rounded-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
        <Input
          placeholder="Buscar..."
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          leftIcon="search"
          className="max-w-xs"
        />
        {filterableColumns.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filterableColumns.map(column => (
              <Select
                key={column.key}
                placeholder={column.header}
                value={filters[column.key] || ''}
                onChange={e => onFilterChange(column.key, e.target.value)}
                options={[
                  { value: '', label: 'Todos' },
                  ...(column.filterOptions || [])
                ]}
                className="w-[160px]"
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {selectedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onSelectionClear}>
            Limpar seleção ({selectedCount})
          </Button>
        )}
        {Object.values(filters).some(v => v) && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <Icon name="x" size="sm" aria-hidden="true" className="mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  sortable = true,
  filterable = false,
  selectable = false,
  onSelectionChange,
  selectedRows = [],
  loading = false,
  emptyMessage = 'Nenhum dado encontrado',
  pagination,
  rowActions,
  className
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState('');
  const [localSelectedRows, setLocalSelectedRows] = useState<string[]>(selectedRows);

  // Sync selected rows from props
  useState(() => {
    setLocalSelectedRows(selectedRows);
  });

  const handleSort = (key: string) => {
    if (!sortable) return;
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchValue('');
  };

  const handleSelectAll = (checked: boolean) => {
    const keys = filteredData.map(keyExtractor);
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

  // Apply filters and search
  const filteredData = useMemo(() => {
    return data.filter(row => {
      // Search filter
      if (searchValue) {
        const searchLower = searchValue.toLowerCase();
        const rowString = JSON.stringify(row).toLowerCase();
        if (!rowString.includes(searchLower)) return false;
      }

      // Column filters
      for (const [key, value] of Object.entries(filters)) {
        if (value && String((row as any)[key]) !== value) {
          return false;
        }
      }

      return true;
    });
  }, [data, filters, searchValue]);

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = (a as any)[sortConfig.key];
      const bVal = (b as any)[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const allSelected = filteredData.length > 0 && filteredData.every(row => localSelectedRows.includes(keyExtractor(row)));

  const hasActiveFilters = Object.values(filters).some(v => v) || searchValue;

  const tableColumns = columns.map(col => ({
    ...col,
    render: col.render,
    className: col.className
  }));

  return (
    <div className={cn('space-y-4', className)}>
      {(filterable || selectable) && (
        <DataTableToolbar
          columns={columns}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          selectedCount={localSelectedRows.length}
          onSelectionClear={() => {
            setLocalSelectedRows([]);
            onSelectionChange?.([]);
          }}
        />
      )}

      <div className="overflow-x-auto glass rounded-lg">
        <Table
          columns={tableColumns}
          data={sortedData}
          keyExtractor={keyExtractor}
          sortable={sortable}
          selectable={selectable}
          onSelectionChange={onSelectionChange}
          selectedRows={localSelectedRows}
          emptyMessage={emptyMessage}
          loading={loading}
          pagination={pagination}
          className="border-0 bg-transparent"
        >
          {rowActions && rowActions.length > 0 && (
            <>
              {sortedData.map((row, rowIndex) => {
                const rowKey = keyExtractor(row);
                return (
                  <tr key={rowKey} data-row-key={rowKey}>
                    {selectable && (
                      <td className="w-12">
                        <input
                          type="checkbox"
                          checked={localSelectedRows.includes(rowKey)}
                          onChange={e => handleSelectRow(rowKey, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-4 h-4 rounded border border-[var(--color-border)] peer-checked:bg-[var(--color-primary)] peer-checked:border-[var(--color-primary)] peer-checked:after:content-[''] peer-checked:after:absolute peer-checked:after:inset-0 peer-checked:after:bg-[var(--color-primary-foreground)] peer-checked:after:flex peer-checked:after:items-center peer-checked:after:justify-center" />
                      </td>
                    )}
                    {tableColumns.map(col => (
                      <td key={col.key} className={col.className}>
                        {col.render ? col.render(row, rowIndex) : (row as any)[col.key]}
                      </td>
                    ))}
                    <td className="w-48">
                      <div className="flex items-center gap-1">
                        {rowActions.map((action, actionIndex) => (
                          <Button
                            key={actionIndex}
                            variant={action.variant || 'ghost'}
                            size="icon-sm"
                            onClick={() => action.onClick(row)}
                            disabled={action.disabled?.(row)}
                            aria-label={action.label}
                          >
                            {action.icon && <Icon name={action.icon} size="sm" aria-hidden="true" />}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </>
          )}
        </Table>
      </div>
    </div>
  );
}