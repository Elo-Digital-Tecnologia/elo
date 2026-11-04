import type { PermissionGroup } from '@elo/core/roles/permissions';
import { PERMISSION_GROUPS, Permission } from '@elo/core/roles/permissions';

const GROUP_LABELS: Record<PermissionGroup['key'], string> = {
    restaurants: 'Restaurantes',
    billing: 'Assinaturas',
    support: 'Suporte',
    team: 'Equipe Elo'
};

const PERMISSION_TEXTS: Record<Permission, { label: string; hint?: string }> = {
    [Permission.RESTAURANTS_VIEW]: { label: 'Ver', hint: 'Lista, busca e detalhes.' },
    [Permission.RESTAURANTS_CREATE]: { label: 'Cadastrar' },
    [Permission.RESTAURANTS_EDIT]: {
        label: 'Editar dados',
        hint: 'Nome, endereço do cardápio, titular e contato.'
    },
    [Permission.RESTAURANTS_SUSPEND]: { label: 'Suspender e reativar' },
    [Permission.CONTRACTS_MANAGE]: {
        label: 'Registrar e renovar contratos',
        hint: 'Anexar o contrato assinado, converter piloto em definitivo e renovar.'
    },
    [Permission.RESTAURANTS_OWNER]: {
        label: 'Trocar o titular',
        hint: 'Passa a administração do restaurante para outra pessoa da equipe.'
    },
    [Permission.RESTAURANTS_DELETE]: {
        label: 'Excluir e restaurar',
        hint: 'Só o superadmin concede.'
    },
    [Permission.PAYMENTS_VIEW]: { label: 'Ver pagamentos' },
    [Permission.PAYMENTS_RECORD]: {
        label: 'Registrar pagamentos',
        hint: 'Também edita, estorna e ajusta o vencimento.'
    },
    [Permission.PLANS_MANAGE]: {
        label: 'Gerenciar planos',
        hint: 'Criar, editar e desativar planos.'
    },
    [Permission.RESTAURANTS_ACCESS]: { label: 'Entrar no painel do restaurante' },
    [Permission.RESTAURANTS_TABLES]: { label: 'Regravar tokens de mesa' },
    [Permission.RESTAURANTS_ACTIVITY]: { label: 'Ver registros de atividade' },
    [Permission.TEAM_MANAGE]: {
        label: 'Gerenciar a equipe',
        hint: 'Só concede o que a própria pessoa tem.'
    }
};

export interface LabeledPermissionGroup {
    label: string;
    items: { permission: Permission; label: string; hint?: string | undefined }[];
}

/** The permission groups with their texts, as the granting screens show them. */
export const LABELED_PERMISSION_GROUPS: LabeledPermissionGroup[] = PERMISSION_GROUPS.map(
    (group) => ({
        label: GROUP_LABELS[group.key],
        items: group.permissions.map((permission) => ({
            permission,
            ...PERMISSION_TEXTS[permission]
        }))
    })
);
