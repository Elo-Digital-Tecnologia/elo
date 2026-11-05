/** The guest's table status, in the bar fixed at the top of their screen. */
export const GUEST_TABLE_STATUS = {
    closed: {
        title: 'Escolha os itens e abra a mesa',
        text: 'Monte a sacola e toque em "Abrir mesa". O garçom confirma antes do primeiro pedido.'
    },
    restaurant_closed: {
        title: 'Restaurante fechado agora',
        text: 'Você pode ver o cardápio. A mesa abre quando o restaurante abrir.'
    },
    pending_open: {
        title: 'Aguardando o garçom',
        text: 'Ele vai confirmar a sua mesa em instantes. Avisamos aqui quando confirmar.'
    },
    open: {
        title: 'Mesa aberta',
        text: 'Envie a comanda quando quiser e acompanhe o preparo em Pedidos.'
    },
    pending_close: {
        title: 'Conta pedida',
        text: 'O garçom vai trazer a conta e fechar a mesa.'
    }
} as const;

export const GUEST_STATUS_TEXTS = {
    steps: ['Abrir a mesa', 'Garçom confirma', 'Fazer pedidos', 'Pedir a conta'],
    showSteps: 'Ver os passos',
    hideSteps: 'Esconder os passos',
    waiter: (name: string) => `Quem atende: ${name}`,
    offline: 'Sem internet. A tela se atualiza quando a conexão voltar.',
    reconnecting: 'Reconectando… A tela continua se atualizando enquanto isso.'
};

/** Pop-ups confirming what the guest just did (silent: they tapped it themselves). */
export const GUEST_ACTION_ALERTS = {
    openRequested: {
        title: 'Pedido de abertura enviado',
        body: 'O garçom vai confirmar a mesa. Avisamos aqui quando ele confirmar.'
    },
    orderSent: {
        title: 'Comanda enviada',
        body: 'Acompanhe o preparo em Pedidos.'
    },
    orderCancelled: {
        title: 'Pedido cancelado',
        body: 'Ele saiu da sua comanda.'
    },
    waiterCalled: {
        title: 'Garçom chamado',
        body: 'Ele já recebeu o aviso e vem até a sua mesa.'
    },
    billRequested: {
        title: 'Conta pedida',
        body: 'O garçom vai trazer a conta e fechar a mesa.'
    },
    failed: 'Não deu certo'
};

export const TABLE_STATE_LABELS = {
    pending_open: 'Abrindo',
    open: 'Aberta',
    pending_close: 'Pediu a conta',
    closed: 'Fechada'
} as const;

export const SESSION_ELSEWHERE_TEXTS = {
    title: (table: string) => `Você já está na ${table}`,
    back: 'Voltar para a minha mesa'
};

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
    elsewhere: {
        title: 'Você já tem uma mesa aberta',
        text: 'Este aparelho já está em outra mesa deste restaurante. Para trocar de mesa, peça ao garçom para fechar a anterior.'
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
