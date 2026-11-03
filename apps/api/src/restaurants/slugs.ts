import type { EntityManager } from 'typeorm';
import { Restaurant, RestaurantSlugAlias } from '../database/entities';

/** The restaurant behind a link: its current one, or one it used before (still printed on QR codes). */
export async function restaurantBySlug(
    em: EntityManager,
    slug: string
): Promise<Restaurant | null> {
    const r = await em.findOne(Restaurant, { where: { slug } });
    if (r) return r;
    const alias = await em.findOne(RestaurantSlugAlias, { where: { slug } });
    return alias ? em.findOne(Restaurant, { where: { id: alias.restaurantId } }) : null;
}

/** Whether a link is taken: by a restaurant (deleted ones keep theirs until purged) or as an old link. */
export async function slugTaken(
    em: EntityManager,
    slug: string,
    except?: string
): Promise<boolean> {
    const owner =
        (await em.findOne(Restaurant, { where: { slug }, withDeleted: true }))?.id ??
        (await em.findOne(RestaurantSlugAlias, { where: { slug } }))?.restaurantId;
    return !!owner && owner !== except;
}
