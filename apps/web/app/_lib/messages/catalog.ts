import type { CategoryKind } from '@elo/core/catalog/category-kinds';
import type { FlavorPricing, ProductGroupKind } from '@elo/core/catalog/option-kinds';
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
    optionalMany: 'Opcional · vários'
};

export const OPTION_EDITOR_TEXTS = {
    empty: 'Sem opções. Use Tamanhos quando o preço muda com o tamanho (açaí 300/500 ml) e Adicionais para extras ou o ponto da carne. Pizzas meio a meio ficam numa categoria do tipo Pizza.',
    sizeName: 'Tamanho',
    kindLabel: {
        size: 'Tamanhos · nome do grupo',
        extra: 'Adicionais · nome do grupo'
    } satisfies Record<ProductGroupKind, string>,
    kindHint: {
        size: 'O cliente escolhe um tamanho, e o preço dele é o preço do produto.',
        extra: 'Cada escolha soma o valor adicional ao preço.'
    } satisfies Record<ProductGroupKind, string>,
    groupPlaceholder: {
        size: 'Tamanho',
        extra: 'Adicionais'
    } satisfies Record<ProductGroupKind, string>,
    choicePlaceholder: {
        size: '500 ml',
        extra: 'Granola'
    } satisfies Record<ProductGroupKind, string>,
    priceLabel: {
        size: 'Preço',
        extra: 'Valor adicional'
    } satisfies Record<ProductGroupKind, string>,
    addChoice: {
        size: 'Adicionar tamanho',
        extra: 'Adicionar escolha'
    } satisfies Record<ProductGroupKind, string>,
    addGroup: {
        size: 'Tamanhos',
        extra: 'Adicionais'
    } satisfies Record<ProductGroupKind, string>,
    required: 'Obrigatório',
    multiple: 'Mais de uma escolha',
    choiceName: 'Nome da escolha',
    removeGroup: 'Remover grupo',
    removeChoice: 'Remover escolha',
    atLeastOneChoice: 'Dê nome a pelo menos uma escolha.'
};

export const PRODUCT_PRICE_TEXTS = {
    hint: 'O preço muda com o tamanho? Use Tamanhos na etapa Opções.',
    bySize: 'Definido pelos tamanhos, na etapa Opções.',
    pizzaTitle: 'Preço por tamanho',
    pizzaHint: 'Deixe em branco os tamanhos em que este sabor não é feito.'
};

export const CATEGORY_KIND_TEXTS = {
    label: 'Tipo',
    kinds: {
        standard: 'Padrão',
        pizza: 'Pizza'
    } satisfies Record<CategoryKind, string>,
    hints: {
        standard: 'Produtos com preço próprio, tamanhos e adicionais.',
        pizza: 'Cada produto é um sabor; tamanhos, regra do meio a meio e bordas valem para todos.'
    } satisfies Record<CategoryKind, string>,
    fixed: 'O tipo não muda depois de criada.'
};

export const PIZZA_TEXTS = {
    configure: 'Configurar pizzas',
    sizesName: 'Nome da etapa de tamanho',
    flavorsName: 'Nome da etapa de sabores',
    defaultSizesName: 'Tamanho',
    defaultFlavorsName: 'Sabores',
    sizes: 'Tamanhos',
    sizesHint: 'Quantos sabores cada tamanho aceita no meio a meio.',
    sizeLabel: 'Nome do tamanho',
    sizePlaceholder: 'Grande',
    maxFlavors: 'Máximo de sabores',
    flavorsShort: 'sabores',
    addSize: 'Adicionar tamanho',
    removeSize: 'Remover tamanho',
    pricingLabel: 'Como cobrar mais de um sabor',
    pricing: {
        highest: 'Cobrar o sabor mais caro',
        average: 'Cobrar a média dos sabores'
    } satisfies Record<FlavorPricing, string>,
    addons: 'Bordas, massas e outros',
    addonsHint:
        'Valem para todos os sabores. Informe o preço em cada tamanho (0 se for grátis).',
    addonName: 'Nome do grupo',
    addonPlaceholder: 'Borda',
    choicePlaceholder: 'Catupiry',
    addAddon: 'Adicionar grupo',
    addChoice: 'Adicionar escolha',
    removeAddon: 'Remover grupo',
    priceAt: (choice: string, size: string) => `Preço de ${choice} no tamanho ${size}`,
    needSizesFirst: 'Adicione os tamanhos primeiro.',
    // Guest builder.
    flavorsUpTo: (max: number) =>
        max === 1 ? 'Pizza de 1 sabor' : `Escolha até ${max} sabores`,
    chargesHighest: 'cobra o sabor mais caro',
    chargesAverage: 'cobra a média dos sabores',
    chooseSize: 'Escolha o tamanho primeiro.',
    notInSize: 'Não disponível neste tamanho'
};
