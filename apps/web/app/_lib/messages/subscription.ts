import type { RestaurantStatus } from '@elo/core/subscription/subscription';

export const RESTAURANT_STATUS_LABEL: Record<RestaurantStatus, string> = {
    pending: 'Pendente',
    active: 'Ativo',
    grace: 'Em tolerância',
    suspended: 'Suspenso',
    ended: 'Contrato encerrado'
};

export const RESTAURANT_STATUS_TEXTS = {
    active: {
        label: 'Ativa',
        text: 'Tudo certo. Seu acesso está liberado.'
    },
    grace: {
        label: 'Vencida, em tolerância',
        text: 'O sistema segue funcionando. Regularize o pagamento antes do fim do prazo.'
    },
    suspended: {
        label: 'Suspensa',
        text: 'O acesso da equipe está bloqueado até a confirmação do pagamento.'
    },
    pending: {
        label: 'Contrato pendente',
        text: 'O contrato com a Elo Digital ainda não está valendo.'
    },
    ended: {
        label: 'Contrato encerrado',
        text: 'O contrato com a Elo Digital terminou e não há renovação valendo.'
    }
};

export const SUSPENSION_TITLES: Record<string, string> = {
    pending: 'Contrato pendente',
    ended: 'Contrato encerrado'
};
