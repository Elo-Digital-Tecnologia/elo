import type { EntityManager } from 'typeorm';
import { RestaurantSlugAliasEntity } from '../entities/restaurant-slug-alias.entity.js';
import { RestaurantEntity } from '../entities/restaurant.entity.js';

/** The restaurant behind a link: its current one, or one it used before (still printed on QR codes). */
export async function restaurantBySlug(
    em: EntityManager,
    slug: string
): Promise<RestaurantEntity | null> {
    const r = await em.findOne(RestaurantEntity, { where: { slug } });
    if (r) return r;
    const alias = await em.findOne(RestaurantSlugAliasEntity, { where: { slug } });
    return alias
        ? em.findOne(RestaurantEntity, { where: { id: alias.restaurantId } })
        : null;
}

/** Whether a link is taken: by a restaurant (deleted ones keep theirs until purged) or as an old link. */
export async function slugTaken(
    em: EntityManager,
    slug: string,
    except?: string
): Promise<boolean> {
    const owner =
        (await em.findOne(RestaurantEntity, { where: { slug }, withDeleted: true }))
            ?.id ??
        (await em.findOne(RestaurantSlugAliasEntity, { where: { slug } }))?.restaurantId;
    return !!owner && owner !== except;
}
