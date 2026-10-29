/** Etiquetas que o restaurante pode marcar em um produto. A lista é fechada. */
export const PRODUCT_TAGS = ['vegetarian', 'vegan', 'gluten_free', 'spicy', 'new'] as const;
export type ProductTag = (typeof PRODUCT_TAGS)[number];

export const PRODUCT_TAG_LABEL: Record<ProductTag, string> = {
  vegetarian: 'Vegetariano',
  vegan: 'Vegano',
  gluten_free: 'Sem glúten',
  spicy: 'Picante',
  new: 'Novo',
};
