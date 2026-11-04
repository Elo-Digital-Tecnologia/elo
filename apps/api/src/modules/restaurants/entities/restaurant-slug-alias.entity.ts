import type { Relation } from 'typeorm';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryColumn
} from 'typeorm';
import { RestaurantEntity } from './restaurant.entity.js';

/**
 * A link a restaurant used before its current one. Printed QR codes and NFC tags keep
 * pointing at it, so it still leads to the restaurant and no one else can take it.
 */
@Entity('restaurant_slug_aliases')
export class RestaurantSlugAliasEntity {
    @PrimaryColumn({ name: 'slug', type: 'varchar', length: 60 })
    public slug: string;

    @Index('IDX_restaurant_slug_aliases_restaurant')
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @ManyToOne(() => RestaurantEntity, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'restaurant_id',
        foreignKeyConstraintName: 'FK_restaurant_slug_aliases_restaurant'
    })
    public restaurant?: Relation<RestaurantEntity> | undefined;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    public createdAt: Date;
}
