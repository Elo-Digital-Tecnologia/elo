export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Segmentos de URL usados pelo sistema; nenhum restaurante pode ter um deles como slug. */
export const RESERVED_SLUGS: readonly string[] = ['admin', 'r', 'api', 'docs', 'media', 'login', 'static', 'assets', 'health'];

export const isReservedSlug = (slug: string): boolean => RESERVED_SLUGS.includes(slug) || slug.startsWith('_');
