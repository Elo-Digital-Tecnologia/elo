import type { ReactNode } from 'react';
import { GlassCard } from './glass-card';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
  /**
   * Place in the phone card (`mobile="cards"`): the card title, its action
   * corner, left out, or a labelled line (default).
   */
  mobile?: 'title' | 'actions' | 'hidden';
}

/** The buttons column keeps its natural width: long text elsewhere in the row wraps instead of squeezing it. */
const isActions = <T,>(c: Column<T>) => c.mobile === 'actions' || c.header === '';

/** Tabela dentro de vidro; linhas realçam no hover. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  mobile = 'scroll',
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** On phones: scroll the table sideways, or show one card per row. */
  mobile?: 'scroll' | 'cards';
}) {
  const cards = mobile === 'cards';
  const titled = columns.filter((c) => c.mobile === 'title');
  const actions = columns.filter((c) => c.mobile === 'actions');
  const lines = columns.filter((c) => !c.mobile);
  return (
    <>
    {cards && (
      <ul className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>
            <GlassCard className="p-4" onClick={onRowClick ? () => onRowClick(row) : undefined}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">{titled.map((c) => <div key={c.key}>{c.cell(row)}</div>)}</div>
                {actions.map((c) => <div key={c.key} className="-mr-1 -mt-1 flex shrink-0 items-center gap-1">{c.cell(row)}</div>)}
              </div>
              {lines.length > 0 && (
                <dl className="mt-3 grid gap-2 border-t border-line/30 pt-3 text-sm">
                  {lines.map((c) => (
                    <div key={c.key} className="flex items-center justify-between gap-3">
                      <dt className="shrink-0 text-muted">{c.header}</dt>
                      <dd className="min-w-0 text-right [overflow-wrap:anywhere]">{c.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </GlassCard>
          </li>
        ))}
      </ul>
    )}
    <GlassCard className={`overflow-hidden ${cards ? 'hidden sm:block' : ''}`}>
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
                  <td key={c.key} className={`px-5 py-3.5 ${isActions(c) ? 'w-px whitespace-nowrap' : '[overflow-wrap:anywhere]'} ${c.align === 'right' ? 'text-right' : ''} ${c.className ?? ''}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
    </>
  );
}
