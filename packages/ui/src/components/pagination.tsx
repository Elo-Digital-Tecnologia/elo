import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

/** "11–20 de 57" with previous and next buttons. Pages start at 1. */
export function Pagination({ page, pageSize, total, onPage, className = '' }: { page: number; pageSize: number; total: number; onPage: (page: number) => void; className?: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, total);
  return (
    <nav className={`flex items-center justify-between gap-3 text-sm text-muted ${className}`} aria-label="Páginas">
      <span className="tabular-nums">{first}–{last} de {total}</span>
      <span className="flex gap-2">
        <Button variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior"><ChevronLeft size={16} /> <span className="hidden sm:inline">Anterior</span></Button>
        <Button variant="ghost" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Próxima página"><span className="hidden sm:inline">Próxima</span> <ChevronRight size={16} /></Button>
      </span>
    </nav>
  );
}
