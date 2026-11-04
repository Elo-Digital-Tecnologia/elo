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

/** Full screen notices of the guest's table link and session. Each one tells how to get back. */
export const SESSION_NOTICES = {
    invalid: {
        title: 'Link não reconhecido',
        text: 'Este QR Code ou tag não é válido. Chame o garçom.'
    },
    unavailable: {
        title: 'Cardápio indisponível no momento',
        text: 'Os pedidos por aqui estão fora do ar. Chame o garçom.'
    },
    in_use: {
        title: 'Mesa em atendimento',
        text: 'Esta mesa já está aberta em outro aparelho. Chame o garçom se precisar.'
    },
    busy: {
        title: 'Muitas tentativas',
        text: 'Esta mesa recebeu muitas leituras seguidas. Aguarde alguns minutos e escaneie o QR Code de novo, ou chame o garçom.'
    },
    error: {
        title: 'Algo deu errado',
        text: 'Não foi possível carregar o cardápio. Escaneie o QR Code da mesa de novo em instantes.'
    },
    taken: {
        title: 'Mesa aberta em outro aparelho',
        text: 'Outra pessoa abriu o link desta mesa depois de você, e este aparelho foi desconectado. Para pedir por aqui, escaneie o QR Code da mesa de novo. Se o outro aparelho já tiver aberto a mesa, chame o garçom.'
    },
    rejected: {
        title: 'Abertura não confirmada',
        text: 'O garçom não confirmou a abertura da mesa. Chame o garçom ou escaneie o QR Code da mesa de novo.'
    },
    expired: {
        title: 'Sessão expirada',
        text: 'Escaneie o QR Code da mesa de novo para continuar.'
    },
    ended: {
        title: 'Atendimento encerrado',
        text: 'Obrigado pela visita! Para pedir de novo, escaneie o QR Code da mesa.'
    }
} as const;
