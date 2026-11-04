import type { FormMessages } from '#/_lib/use-form';
import { ApiErrorCode } from '@elo/core/api/api-error-code';

/** Messages for failures that no specific code explains. */
export const GENERIC_MESSAGES = {
    invalidValue: 'Valor inválido.',
    serverFailure: 'O servidor não conseguiu concluir agora. Tente de novo em instantes.',
    requestFailure: 'Não foi possível concluir. Tente de novo.',
    connectionFailure: 'Falha de conexão. Confira a internet e tente de novo.'
};

export const GUEST_ERRORS: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.ORDERS_IN_PROGRESS]:
        'Ainda há pedidos sendo preparados. Peça a conta quando todos estiverem prontos.',
    [ApiErrorCode.TABLE_NOT_OPEN]: 'A mesa ainda não foi aberta pelo garçom.',
    [ApiErrorCode.INVALID_TABLE_STATE]: 'A mesa mudou. Atualizamos a tela.',
    [ApiErrorCode.RESTAURANT_CLOSED]:
        'O restaurante está fechado agora, então a mesa não pode ser aberta.',
    [ApiErrorCode.FEE_REFUSAL_DISABLED]:
        'Este restaurante não permite retirar a taxa de serviço por aqui. Fale com o garçom.',
    [ApiErrorCode.PRODUCT_UNAVAILABLE]:
        'Um item da sacola esgotou. Remova-o e envie de novo.',
    [ApiErrorCode.INVALID_PRODUCT]:
        'Um item da sacola saiu do cardápio. Remova-o e envie de novo.',
    [ApiErrorCode.INVALID_OPTION]:
        'As opções de um item mudaram no cardápio. Remova-o da sacola e adicione de novo.',
    [ApiErrorCode.MISSING_REQUIRED_OPTION]:
        'Falta escolher uma opção obrigatória em um item. Remova-o da sacola e adicione de novo.',
    [ApiErrorCode.TOO_MANY_OPTIONS]:
        'Um item tem mais escolhas do que o grupo permite. Remova-o da sacola e adicione de novo.',
    [ApiErrorCode.DUPLICATE_OPTION]:
        'Um item tem a mesma escolha repetida. Remova-o da sacola e adicione de novo.'
};

export const AVATAR_ERRORS: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.INVALID_IMAGE]: 'O arquivo não é uma imagem válida.',
    [ApiErrorCode.UNSUPPORTED_IMAGE_TYPE]: 'Use uma foto em JPG, PNG ou WebP.'
};

export const REVIEW_ERRORS: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.TABLE_NOT_OPEN]:
        'A avaliação fica disponível enquanto a mesa estiver aberta.'
};

export const BILLING_ERRORS: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.NO_PLAN]:
        'Nenhum contrato com plano está valendo. O plano vem com o contrato: registre ou renove o contrato.',
    [ApiErrorCode.CONTRACT_PENDING]:
        'A cobrança começa com o contrato. Registre o contrato antes do pagamento.',
    [ApiErrorCode.NOTHING_OWED]:
        'O contrato terminou e não há dias cobertos em aberto. Registre a renovação para receber de novo.',
    [ApiErrorCode.NOT_LATEST_ENTRY]: 'Só o lançamento mais recente pode ser estornado.',
    [ApiErrorCode.ALREADY_VOIDED]: 'Este lançamento já foi estornado.',
    [ApiErrorCode.PLAN_INACTIVE]: 'Este plano foi desativado. Escolha outro.',
    [ApiErrorCode.INVALID_DATE]: 'Data inválida.',
    [ApiErrorCode.PLAN_NOT_FOUND]: 'Este plano não existe mais. Escolha outro.',
    [ApiErrorCode.NOT_A_PAYMENT]:
        'Só pagamentos podem ser corrigidos. Para um ajuste, estorne e faça de novo.',
    [ApiErrorCode.RECEIPT_IN_USE]:
        'Este comprovante já está em outro pagamento. Envie o arquivo certo.',
    [ApiErrorCode.RECEIPT_ALREADY_ATTACHED]: 'Este pagamento já tem comprovante.',
    [ApiErrorCode.INVALID_DOCUMENT]:
        'O arquivo enviado não pertence a este restaurante. Envie de novo.'
};

export const CONTRACT_ERRORS: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.INVALID_DOCUMENT]:
        'O arquivo enviado não pertence a este restaurante. Envie de novo.',
    [ApiErrorCode.DOCUMENT_IN_USE]:
        'Este arquivo já está em outro contrato. Envie o contrato certo.',
    [ApiErrorCode.NOT_LATEST_CONTRACT]: 'Só o contrato mais recente pode ser anulado.',
    [ApiErrorCode.CONTRACT_ALREADY_VOIDED]: 'Este contrato já foi anulado.',
    [ApiErrorCode.TRIAL_OVER]: 'O período de teste já terminou.',
    [ApiErrorCode.PLAN_INACTIVE]: 'Este plano foi desativado. Escolha outro.',
    [ApiErrorCode.PLAN_NOT_FOUND]: 'Este plano não existe mais. Escolha outro.'
};

export const DOCUMENT_UPLOAD_ERRORS: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.UNSUPPORTED_DOCUMENT]: 'Envie um PDF ou uma foto (JPG, PNG ou WebP).',
    [ApiErrorCode.FILE_TOO_LARGE]: 'O arquivo pode ter até 10 MB.',
    [ApiErrorCode.FILE_REQUIRED]: 'Escolha um arquivo.'
};

export const RESTAURANT_ADMIN_ERRORS: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.NOT_SUSPENDED]: 'Suspenda o acesso antes de excluir.',
    [ApiErrorCode.SLUG_MISMATCH]: 'O link digitado não confere.',
    [ApiErrorCode.RESTAURANT_DELETED]: 'Este restaurante foi excluído.',
    [ApiErrorCode.INVALID_OWNER]: 'Escolha alguém ativo da equipe.'
};

export const SLUG_CHANGE_ERRORS = {
    [ApiErrorCode.SLUG_TAKEN]: 'Este endereço já é (ou já foi) de outro restaurante.',
    [ApiErrorCode.SLUG_RESERVED]: 'Este endereço é reservado pelo sistema. Escolha outro.'
};

/** The link comes from the name (there is no link field), so link conflicts land under the name. */
export const RESTAURANT_CREATION_FIELD_ERRORS: FormMessages = {
    [ApiErrorCode.SLUG_TAKEN]: 'Já existe um restaurante com esse link; mude o nome.',
    [ApiErrorCode.SLUG_RESERVED]:
        'Esse nome gera um link reservado do sistema; mude o nome.',
    invalid_slug: 'Esse nome não gera um link válido; use letras ou números.',
    [ApiErrorCode.INVALID_SLUG]:
        'Esse nome não gera um link válido; use letras ou números.',
    [ApiErrorCode.USERNAME_TAKEN]: 'Esse usuário já existe.'
};

export const RESTAURANT_CREATION_ERRORS: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.PLAN_INACTIVE]: 'Este plano foi desativado. Escolha outro.',
    [ApiErrorCode.PLAN_NOT_FOUND]: 'Este plano não existe mais. Escolha outro.'
};

/** Steps after the restaurant exists; a failure leaves it created and Pendente. */
export const CONTRACT_UPLOAD_ERRORS: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.UNSUPPORTED_DOCUMENT]: 'O arquivo não é um PDF ou uma foto aceita.',
    [ApiErrorCode.FILE_TOO_LARGE]: 'O arquivo passa de 10 MB.'
};

export const ELO_TEAM_ERRORS: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.USERNAME_TAKEN]: 'Esse usuário já existe na equipe Elo.',
    [ApiErrorCode.CANNOT_GRANT]: 'Você marcou uma permissão que não pode conceder.',
    [ApiErrorCode.TARGET_IS_SELF]: 'Você não pode alterar a própria conta por aqui.'
};

/** `invalid` only comes from the confirmation check: the API has no such rule for passwords. */
export const PASSWORD_CHANGE_MESSAGES = {
    invalid: 'A confirmação não confere com a nova senha.'
};

export const CASHIER_ERRORS: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.NO_ACTIVE_SESSION]: 'A mesa não tem sessão ativa.',
    [ApiErrorCode.ZERO_ADJUSTMENT]: 'O valor do ajuste não pode ser zero.',
    [ApiErrorCode.TOO_MANY_ADJUSTMENTS]:
        'Esta conta já chegou ao limite de 50 ajustes. Remova um antes de aplicar outro.'
};

export const MENU_ERRORS: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.CATEGORY_NOT_EMPTY]:
        'Esta categoria ainda tem produtos. Mova ou remova os produtos primeiro.',
    [ApiErrorCode.INVALID_CATEGORY]:
        'Essa categoria não existe mais. Escolha outra na etapa Dados.',
    [ApiErrorCode.INVALID_ORDER]:
        'O cardápio mudou em outro aparelho. Atualize a página e tente de novo.'
};

export const PRODUCT_FORM_MESSAGES = { invalid_option: 'Escolha uma categoria.' };

export const STAFF_ERRORS: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.USERNAME_TAKEN]: 'Esse usuário já existe na equipe.',
    [ApiErrorCode.TARGET_NOT_BELOW]:
        'Gerentes cuidam só de garçons, cozinha e caixa. Gerentes são definidos pelo titular.',
    [ApiErrorCode.TARGET_IS_SELF]:
        'Você não pode desativar, excluir ou trocar os perfis da própria conta.',
    [ApiErrorCode.TARGET_IS_OWNER]:
        'O titular não é desativado nem excluído. Para trocar, use "Tornar titular".',
    [ApiErrorCode.WRONG_PASSWORD]: 'Senha incorreta.',
    [ApiErrorCode.INVALID_OWNER]: 'Escolha alguém ativo da equipe.'
};

export const STAFF_FORM_MESSAGES = {
    [ApiErrorCode.USERNAME_TAKEN]: STAFF_ERRORS[ApiErrorCode.USERNAME_TAKEN],
    too_few: 'Escolha pelo menos um perfil.'
};

export const OWNER_LOCKED_MESSAGE = 'Só o próprio titular altera os dados dele.';

const serviceFeeMessage = (maxPct: number) =>
    `Use um valor maior que 0% e até ${maxPct}%, como 10 ou 12,5. Para não cobrar, desligue a taxa.`;

/** The fee is the only number in the settings form, so its range codes always mean the percent. */
export const settingsFormMessages = (maxPct: number) => ({
    too_small: serviceFeeMessage(maxPct),
    too_large: serviceFeeMessage(maxPct),
    not_integer: serviceFeeMessage(maxPct)
});

export const serviceFeeHint = (maxPct: number) => `Acima de 0% e até ${maxPct}%.`;
