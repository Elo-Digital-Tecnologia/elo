import type { ProductTag } from '../../catalog/product-tags.js';

export interface OptionChoice {
    label: string;
    priceCents: number;
}

export interface OptionGroup {
    name: string;
    required: boolean;
    multiple: boolean;
    choices: OptionChoice[];
}

export interface ProductView {
    id: string;
    categoryId: string;
    name: string;
    description: string | null;
    priceCents: number;
    imageUrl: string | null;
    available: boolean;
    featured: boolean;
    tags: ProductTag[];
    position: number;
    options: OptionGroup[];
}

export interface CategoryView {
    id: string;
    name: string;
    position: number;
    products: ProductView[];
}
