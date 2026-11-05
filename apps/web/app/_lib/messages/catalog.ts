import type { FlavorPricing, OptionGroupKind } from '@elo/core/catalog/option-kinds';
import type { ProductTag } from '@elo/core/catalog/product-tags';

export const PRODUCT_TAG_LABEL: Record<ProductTag, string> = {
    vegetarian: 'Vegetariano',
    vegan: 'Vegano',
    gluten_free: 'Sem glúten',
    spicy: 'Picante',
    new: 'Novo'
};

export const CATALOG_TEXTS = {
    priceFrom: 'a partir de',
    required: 'Obrigatório',
    optional: 'Opcional',
    optionalMany: 'Opcional · vários',
    chooseSizeFirst: 'Escolha o tamanho primeiro.',
    flavorsUpTo: (max: number) =>
        max === 1 ? 'Escolha 1 sabor' : `Escolha até ${max} sabores`,
    flavorsHighest: 'cobra o sabor de maior valor',
    flavorsAverage: 'cobra a média dos sabores'
};

export const OPTION_EDITOR_TEXTS = {
    empty: 'Sem opções. Use Tamanhos para preço por tamanho (como pizza), Sabores para meio a meio e Adicionais para borda, extras ou o ponto da carne.',
    sizeName: 'Tamanho',
    flavorName: 'Sabores',
    kindLabel: {
        size: 'Tamanhos · nome do grupo',
        flavor: 'Sabores (meio a meio) · nome do grupo',
        extra: 'Adicionais · nome do grupo'
    } satisfies Record<OptionGroupKind, string>,
    groupPlaceholder: {
        size: 'Tamanho',
        flavor: 'Sabores',
        extra: 'Borda'
    } satisfies Record<OptionGroupKind, string>,
    choicePlaceholder: {
        size: 'Grande',
        flavor: 'Calabresa',
        extra: 'Catupiry'
    } satisfies Record<OptionGroupKind, string>,
    priceLabel: {
        size: 'Preço',
        flavor: 'Preço',
        extra: 'Valor adicional'
    } satisfies Record<OptionGroupKind, string>,
    addChoice: {
        size: 'Adicionar tamanho',
        flavor: 'Adicionar sabor',
        extra: 'Adicionar escolha'
    } satisfies Record<OptionGroupKind, string>,
    addGroup: {
        size: 'Tamanhos',
        flavor: 'Sabores (meio a meio)',
        extra: 'Adicionais'
    } satisfies Record<OptionGroupKind, string>,
    sizeHint: 'O cliente escolhe um tamanho, e o preço dele é o preço do produto.',
    sizeHintFlavors:
        'O cliente escolhe um tamanho; o preço vem dos sabores. Informe quantos sabores cada tamanho aceita.',
    flavorHint: 'Informe o preço de cada sabor em cada tamanho.',
    extraHint: 'Cada escolha soma o valor adicional ao preço.',
    flavorNeedsSizes: 'Adicione os tamanhos antes dos sabores.',
    flavorPricingLabel: 'Como cobrar mais de um sabor',
    flavorPricing: {
        highest: 'Cobrar o sabor mais caro',
        average: 'Cobrar a média dos sabores'
    } satisfies Record<FlavorPricing, string>,
    flavorPriceAt: (flavor: string, size: string) =>
        `Preço de ${flavor} no tamanho ${size}`,
    maxFlavors: 'Máximo de sabores',
    flavorsShort: 'sabores',
    required: 'Obrigatório',
    multiple: 'Mais de uma escolha',
    choiceName: 'Nome da escolha',
    removeGroup: 'Remover grupo',
    removeChoice: 'Remover escolha',
    atLeastOneChoice: 'Dê nome a pelo menos uma escolha.'
};

export const PRODUCT_PRICE_TEXTS = {
    hint: 'Preço por tamanho, como pizza? Use Tamanhos na etapa Opções.',
    bySize: 'Definido pelos tamanhos, na etapa Opções.'
};
