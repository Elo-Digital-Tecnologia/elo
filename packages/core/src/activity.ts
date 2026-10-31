/** Kinds of activity recorded for a restaurant and shown in its activity log. */
export const ACTIVITY_CATEGORIES = {
  tables: 'Mesas',
  orders: 'Pedidos',
  team: 'Equipe',
  payments: 'Pagamentos',
  settings: 'Configurações',
  restaurant: 'Restaurante',
  support: 'Suporte Elo',
} as const;
export type ActivityCategory = keyof typeof ACTIVITY_CATEGORIES;

export const ACTIVITY_ACTIONS = {
  table_created: { category: 'tables', label: 'Mesa criada' },
  table_removed: { category: 'tables', label: 'Mesa removida' },
  table_token_rotated: { category: 'tables', label: 'Link da mesa regravado' },
  table_taken: { category: 'tables', label: 'Mesa assumida' },
  order_cancelled: { category: 'orders', label: 'Pedido cancelado' },
  order_returned: { category: 'orders', label: 'Pedido devolvido' },
  staff_created: { category: 'team', label: 'Pessoa cadastrada' },
  staff_updated: { category: 'team', label: 'Cadastro alterado' },
  staff_roles_changed: { category: 'team', label: 'Perfis alterados' },
  staff_password_reset: { category: 'team', label: 'Senha redefinida' },
  staff_activated: { category: 'team', label: 'Acesso reativado' },
  staff_deactivated: { category: 'team', label: 'Acesso desativado' },
  staff_archived: { category: 'team', label: 'Pessoa excluída' },
  ownership_transferred: { category: 'team', label: 'Titular transferido' },
  payment_recorded: { category: 'payments', label: 'Pagamento registrado' },
  payment_edited: { category: 'payments', label: 'Pagamento corrigido' },
  payment_voided: { category: 'payments', label: 'Lançamento estornado' },
  due_date_adjusted: { category: 'payments', label: 'Vencimento ajustado' },
  plan_changed: { category: 'payments', label: 'Plano alterado' },
  settings_updated: { category: 'settings', label: 'Configurações alteradas' },
  pause_created: { category: 'settings', label: 'Parada agendada' },
  pause_ended: { category: 'settings', label: 'Parada encerrada' },
  restaurant_edited: { category: 'restaurant', label: 'Dados alterados pela Elo' },
  restaurant_suspended: { category: 'restaurant', label: 'Acesso suspenso' },
  restaurant_reactivated: { category: 'restaurant', label: 'Acesso reativado' },
  restaurant_deleted: { category: 'restaurant', label: 'Restaurante excluído' },
  restaurant_restored: { category: 'restaurant', label: 'Restaurante restaurado' },
  restaurant_purged: { category: 'restaurant', label: 'Dados apagados de vez' },
  restaurant_access: { category: 'support', label: 'Equipe Elo entrou no painel' },
} as const satisfies Record<string, { category: ActivityCategory; label: string }>;
export type ActivityAction = keyof typeof ACTIVITY_ACTIONS;

export const actionsIn = (category: ActivityCategory): ActivityAction[] =>
  (Object.keys(ACTIVITY_ACTIONS) as ActivityAction[]).filter((a) => ACTIVITY_ACTIONS[a].category === category);

export type ActorKind = 'staff' | 'elo' | 'system';

export interface ActivityView {
  id: string;
  action: ActivityAction;
  actorName: string;
  actorKind: ActorKind;
  /** What the action was about: a table, a person, an order's table. */
  target: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityPage {
  items: ActivityView[];
  total: number;
  page: number;
  pageSize: number;
}
