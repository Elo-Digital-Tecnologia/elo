import type {
    ContractKind,
    ContractOrigin,
    ContractProblem
} from '@elo/core/contracts/contracts';
import { CONTRACT_LIMITS } from '@elo/core/contracts/contracts';

export const CONTRACT_KIND_LABEL: Record<ContractKind, string> = {
    pilot: 'Piloto',
    definitive: 'Definitivo'
};

export const CONTRACT_ORIGIN_LABEL: Record<ContractOrigin, string> = {
    initial: 'Primeiro contrato',
    conversion: 'Conversão em definitivo',
    renewal: 'Renovação'
};

export const CONTRACT_PROBLEMS: Record<ContractProblem, string> = {
    signed_in_future: 'A data de assinatura não pode ser no futuro.',
    signed_after_end: 'A assinatura não pode ser depois do fim da vigência.',
    ends_before_start: 'O fim da vigência precisa ser depois do início.',
    too_long: `A vigência pode ter no máximo ${CONTRACT_LIMITS.maxYears} anos.`,
    already_has_contract: 'Este restaurante já tem contrato: use Renovar ou Converter.',
    nothing_to_renew: 'Não há contrato para renovar.',
    overlaps: 'A renovação precisa começar depois do fim do contrato atual.',
    nothing_to_convert:
        'A conversão vale para o piloto atual e começa durante a vigência dele (ou no dia seguinte ao fim).',
    conversion_is_definitive: 'A conversão gera um contrato definitivo.',
    trial_only_initial_pilot:
        'Período de teste só no primeiro contrato, e só se for piloto.',
    plan_required: 'Escolha o plano do contrato.'
};

export const CONTRACT_ORIGIN_TITLES: Record<ContractOrigin, string> = {
    initial: 'Registrar contrato',
    conversion: 'Converter em definitivo',
    renewal: 'Renovar contrato'
};
