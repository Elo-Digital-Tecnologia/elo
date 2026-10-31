/** Longest slug: it travels in QR Codes and every public URL. */
export const SLUG_MAX = 60;

/** URL-safe name, at most `SLUG_MAX` characters, never ending in a hyphen. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Segmentos de URL usados pelo sistema; nenhum restaurante pode ter um deles como slug. */
export const RESERVED_SLUGS: readonly string[] = ['admin', 'r', 'api', 'docs', 'media', 'login', 'static', 'assets', 'health'];

export const isReservedSlug = (slug: string): boolean => RESERVED_SLUGS.includes(slug) || slug.startsWith('_');
