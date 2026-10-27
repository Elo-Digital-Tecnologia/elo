import type { ReactNode } from 'react';
import { GlassCard } from './glass-card';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

/** Tabela dentro de vidro; linhas realçam no hover. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="overflow-x-auto scroll-soft">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-line/40 text-left text-muted">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`px-5 py-3.5 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-line/20 transition-colors last:border-0 hover:bg-brand/10 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-5 py-3.5 ${c.align === 'right' ? 'text-right' : ''} ${c.className ?? ''}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
