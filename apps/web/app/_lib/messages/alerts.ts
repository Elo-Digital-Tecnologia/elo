import type {
    Alert,
    AlertKind,
    GuestAlert,
    GuestAlertKind
} from '@elo/core/alerts/alerts';

export interface AlertText {
    title: string;
    body: string;
}

interface AlertTemplate extends AlertText {
    /** Used when the order has no items to list. */
    emptyBody?: string;
}

/**
 * Alert texts as templates (`{table}`, `{who}`, `{items}`), so the service worker can
 * render push notifications from the same source (served by `/push-messages.js`).
 */
export const ALERT_MESSAGES = {
    fallbacks: { table: 'Mesa', who: 'O garçom' },
    orderItem: '{quantity}x {name}',
    itemSeparator: ', ',
    staff: {
        open_request: {
            title: '{table} quer abrir a mesa',
            body: 'Valide a abertura no salão.'
        },
        call: { title: '{table} chamou o garçom', body: 'Toque para ver os chamados.' },
        bill_request: {
            title: '{table} pediu a conta',
            body: 'Feche a mesa quando a conta for paga.'
        },
        order_ready: { title: 'Pedido pronto: {table}', body: 'Pode levar à mesa.' },
        new_order: { title: 'Novo pedido: {table}', body: 'Toque para ver a comanda.' },
        order_cancelled: {
            title: 'Pedido cancelado: {table}',
            body: 'Pare o preparo deste pedido.'
        }
    } satisfies Record<AlertKind, AlertTemplate>,
    guest: {
        table_opened: {
            title: 'Sua mesa foi aberta',
            body: '{who} liberou os pedidos. Bom apetite!'
        },
        table_closed: {
            title: 'Mesa fechada',
            body: 'Obrigado pela visita! Volte sempre.'
        },
        order_preparing: { title: 'Seu pedido está em preparo', body: '{items}' },
        order_ready: {
            title: 'Seu pedido está pronto',
            body: '{items}',
            emptyBody: 'Logo chega à mesa.'
        },
        call_answered: {
            title: '{who} está indo até você',
            body: 'Seu chamado foi atendido.'
        }
    } satisfies Record<GuestAlertKind, AlertTemplate>
};

const fill = (template: string, params: Record<string, string>) =>
    template.replace(/\{(\w+)\}/g, (match, key: string) => params[key] ?? match);

const render = (template: AlertTemplate, params: Record<string, string>): AlertText => ({
    title: fill(template.title, params),
    body:
        template.emptyBody && params['items'] === ''
            ? template.emptyBody
            : fill(template.body, params)
});

export const staffAlertText = (alert: Pick<Alert, 'kind' | 'table'>): AlertText =>
    render(ALERT_MESSAGES.staff[alert.kind], {
        table: alert.table ?? ALERT_MESSAGES.fallbacks.table
    });

export const guestAlertText = (
    alert: Pick<GuestAlert, 'kind' | 'who' | 'items'>
): AlertText =>
    render(ALERT_MESSAGES.guest[alert.kind], {
        who: alert.who ?? ALERT_MESSAGES.fallbacks.who,
        items: alert.items
            .map((item) =>
                fill(ALERT_MESSAGES.orderItem, {
                    quantity: String(item.quantity),
                    name: item.name
                })
            )
            .join(ALERT_MESSAGES.itemSeparator)
    });
