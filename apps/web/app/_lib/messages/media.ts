import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { IMAGE_UPLOAD_MAX_MB, MEDIA_PER_RESTAURANT } from '@elo/core/media/media-limits';

export const IMAGE_PICKER_TEXTS = {
    dropPrefix: 'Arraste uma foto, cole ou',
    dropChoose: 'escolha no aparelho',
    dropHint: `JPG, PNG ou WebP, até ${IMAGE_UPLOAD_MAX_MB} MB. A imagem é reduzida automaticamente.`,
    chosen: 'Foto escolhida',
    removeChosen: 'Tirar a foto escolhida',
    library: 'Suas imagens',
    count: (count: number) => `${count} de ${MEDIA_PER_RESTAURANT}`,
    empty: 'Nenhuma imagem enviada ainda.',
    search: 'Buscar pelo nome',
    noMatch: 'Nenhuma imagem com esse nome.',
    showMore: (left: number) => `Mostrar mais (${left})`,
    use: (name: string) => `Usar ${name}`,
    inUse: 'Em uso',
    remove: (name: string) => `Apagar ${name}`,
    removeTitle: 'Apagar imagem?',
    removeBody: 'A imagem sai da sua biblioteca e não pode ser recuperada.',
    removeConfirm: 'Apagar',
    linkSummary: 'Usar o link de uma imagem',
    linkLabel: 'Link da imagem'
};

export const IMAGE_FIELD_TEXTS = {
    change: 'Trocar',
    choose: 'Escolher imagem',
    none: 'Sem imagem',
    remove: (label: string) => `Tirar ${label.toLowerCase()}`
};

export const MEDIA_ERRORS = {
    notImage: 'Escolha um arquivo de imagem.',
    tooLarge: `A imagem passa de ${IMAGE_UPLOAD_MAX_MB} MB.`,
    full: `Sua biblioteca chegou a ${MEDIA_PER_RESTAURANT} imagens. Apague as que não usa para enviar novas.`
};

export const MEDIA_API_ERRORS: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.INVALID_IMAGE]: 'O arquivo não é uma imagem válida.',
    [ApiErrorCode.UNSUPPORTED_IMAGE_TYPE]: 'Use uma imagem JPG, PNG ou WebP.',
    [ApiErrorCode.IMAGE_IN_USE]:
        'Esta imagem está em uso num produto, no logo ou no banner. Troque-a lá antes de apagar.',
    [ApiErrorCode.MEDIA_LIMIT]: MEDIA_ERRORS.full
};
