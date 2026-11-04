import type { PaymentProblem } from '@elo/core/billing/billing';
import { BILLING_LIMITS } from '@elo/core/billing/billing';

/** How a plan's cycle reads in the screens. */
export const cycleLabel = (months: number) =>
    months === 1 ? 'mensal' : months === 12 ? 'anual' : `a cada ${months} meses`;

export const PAYMENT_PROBLEMS: Record<
    PaymentProblem | 'due_in_past' | 'reason_required',
    string
> = {
    paid_in_future: 'A data do pagamento não pode ser no futuro.',
    paid_before_creation: 'A data do pagamento é anterior ao cadastro do restaurante.',
    cycles_out_of_range: `Escolha de 1 a ${BILLING_LIMITS.cyclesMax} ciclos.`,
    amount_out_of_range: 'Valor fora do esperado para este plano.',
    note_required:
        'O valor é diferente do plano: explique na observação (por exemplo, um desconto).',
    note_too_long: `A observação pode ter até ${BILLING_LIMITS.noteMax} caracteres.`,
    receipt_required: 'Anexe o comprovante ou explique por que não há um.',
    receipt_or_reason: 'Com o comprovante anexado, não é preciso explicar a falta dele.',
    due_in_past: 'O vencimento não pode ser antes de hoje.',
    reason_required: 'Informe o motivo.'
};

export const BILLING_MONTH_TEXTS = {
    paid_on_time: {
        label: 'Pago em dia'
    },
    paid_late: {
        label: 'Pago com atraso'
    },
    trial: {
        label: 'Em teste'
    },
    uncovered: {
        label: 'Sem pagamento'
    },
    future: {
        label: 'Ainda não chegou'
    },
    before: {
        label: 'Antes do cadastro'
    }
};
