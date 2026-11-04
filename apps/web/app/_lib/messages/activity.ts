import type {
    ActivityAction,
    ActivityCategory,
    ActorKind
} from '@elo/core/activity/activity-actions';

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
    tables: 'Mesas',
    orders: 'Pedidos',
    team: 'Equipe',
    payments: 'Pagamentos',
    settings: 'Configurações',
    restaurant: 'Restaurante',
    support: 'Suporte Elo'
};

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
    table_created: 'Mesa criada',
    table_removed: 'Mesa removida',
    table_token_rotated: 'Link da mesa regravado',
    table_taken: 'Mesa assumida',
    order_cancelled: 'Pedido cancelado',
    order_returned: 'Pedido devolvido',
    staff_created: 'Pessoa cadastrada',
    staff_updated: 'Cadastro alterado',
    staff_roles_changed: 'Perfis alterados',
    staff_password_reset: 'Senha redefinida',
    staff_activated: 'Acesso reativado',
    staff_deactivated: 'Acesso desativado',
    staff_archived: 'Pessoa excluída',
    ownership_transferred: 'Titular transferido',
    payment_recorded: 'Pagamento registrado',
    payment_edited: 'Pagamento corrigido',
    payment_voided: 'Lançamento estornado',
    due_date_adjusted: 'Vencimento ajustado',
    plan_changed: 'Plano alterado',
    trial_ended: 'Período de teste encerrado',
    contract_registered: 'Contrato registrado',
    contract_converted: 'Piloto convertido em definitivo',
    contract_renewed: 'Contrato renovado',
    contract_voided: 'Contrato anulado',
    settings_updated: 'Configurações alteradas',
    slug_changed: 'Endereço do cardápio alterado',
    pause_created: 'Parada agendada',
    pause_ended: 'Parada encerrada',
    opening_created: 'Aberto fora do horário',
    opening_ended: 'Abertura extra encerrada',
    restaurant_edited: 'Dados alterados pela Elo',
    restaurant_suspended: 'Acesso suspenso',
    restaurant_reactivated: 'Acesso reativado',
    restaurant_deleted: 'Restaurante excluído',
    restaurant_restored: 'Restaurante restaurado',
    restaurant_purged: 'Dados apagados de vez',
    restaurant_access: 'Equipe Elo entrou no painel'
};

/** Shown when the record carries no actor name. */
export const ACTOR_FALLBACK_LABELS: Record<ActorKind, string> = {
    system: 'Sistema',
    elo: 'Equipe Elo',
    staff: 'Usuário removido'
};

/** Field names as the settings screens call them. */
export const ACTIVITY_FIELD_LABELS: Record<string, string> = {
    name: 'nome',
    managerName: 'responsável pelo contrato',
    managerContact: 'contato do responsável',
    serviceFeeBps: 'taxa de serviço',
    guestFeeRefusal: 'recusa da taxa pelo cliente',
    description: 'descrição',
    logoUrl: 'logo',
    coverUrl: 'capa',
    address: 'endereço',
    phone: 'telefone',
    instagram: 'Instagram',
    googleReviewUrl: 'link de avaliação do Google',
    wifiName: 'nome do Wi-Fi',
    wifiPassword: 'senha do Wi-Fi',
    openingHours: 'horários',
    amountCents: 'valor',
    paidAt: 'data do pagamento',
    note: 'observação',
    receipt: 'comprovante',
    noReceiptReason: 'motivo da falta de comprovante'
};
