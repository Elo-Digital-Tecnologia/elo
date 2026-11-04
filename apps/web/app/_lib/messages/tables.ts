export const TABLE_STATE_HINTS: Record<string, string> = {
    closed: 'Escolha os itens e abra a mesa.',
    pending_open: 'Aguardando o garçom confirmar a mesa.',
    open: 'Mesa aberta. Envie a comanda quando quiser.',
    pending_close: 'Conta pedida. O garçom vai fechar a mesa.'
};

export const TABLE_STATE_LABELS = {
    pending_open: 'Abrindo',
    open: 'Aberta',
    pending_close: 'Pediu a conta',
    closed: 'Fechada'
} as const;

export const TABLE_STATE_TEXTS = {
    closed: {
        label: 'Livre'
    },
    pending_open: {
        label: 'Aguardando garçom'
    },
    open: {
        label: 'Aberta'
    },
    pending_close: {
        label: 'Pediu a conta'
    }
};
