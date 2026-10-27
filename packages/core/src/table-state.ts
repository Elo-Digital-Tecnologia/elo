import type { TableState } from './orders';

/** Transições válidas do estado da mesa. Fonte única; quem muda estado consulta aqui. */
const TRANSITIONS: Record<TableState, TableState[]> = {
  closed: ['pending_open'],
  pending_open: ['open', 'closed'],
  open: ['pending_close'],
  pending_close: ['closed', 'open'],
};

export function canTransitionTable(from: TableState, to: TableState): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Garçom pode encerrar direto de `open` também (cliente não precisa solicitar). */
export function canWaiterClose(from: TableState): boolean {
  return from === 'open' || from === 'pending_close';
}
