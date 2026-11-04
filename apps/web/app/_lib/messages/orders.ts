export const ORDER_LINE_PARTS: Record<string, string> = {
    notes: 'Observação de',
    quantity: 'Quantidade de',
    options: 'Opções de'
};

export const ORDER_TRACKER_TEXTS = [
    {
        label: 'Enviado'
    },
    {
        label: 'Recebido'
    },
    {
        label: 'Em preparo'
    },
    {
        label: 'Pronto'
    }
];

export const ORDER_STATUS_TEXTS = {
    sent: {
        label: 'Enviado'
    },
    received: {
        label: 'Recebido'
    },
    preparing: {
        label: 'Em preparo'
    },
    ready: {
        label: 'Pronto'
    },
    cancelled: {
        label: 'Cancelado'
    },
    returned: {
        label: 'Devolvido'
    }
};

export const ORDER_HISTORY_STATUS_TEXTS = {
    sent: {
        label: 'Enviado'
    },
    received: {
        label: 'Recebido'
    },
    preparing: {
        label: 'Em preparo'
    },
    ready: {
        label: 'Pronto'
    },
    cancelled: {
        label: 'Cancelado'
    },
    returned: {
        label: 'Devolvido'
    }
};

export const KITCHEN_NEXT_STEP_LABELS: Record<string, string> = {
    received: 'Marcar recebido',
    preparing: 'Iniciar preparo',
    ready: 'Marcar pronto'
};

export const KITCHEN_STATUS_LABELS = {
    sent: 'Novo',
    received: 'Recebido',
    preparing: 'Em preparo'
} as const;
