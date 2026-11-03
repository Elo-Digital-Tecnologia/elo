import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryColumn
} from 'typeorm';
import { Restaurant } from './restaurant.entity';

/**
 * A link a restaurant used before its current one. Printed QR codes and NFC tags keep
 * pointing at it, so it still leads to the restaurant and no one else can take it.
 */
@Entity('restaurant_slug_aliases')
export class RestaurantSlugAlias {
    @PrimaryColumn({ type: 'varchar', length: 60 }) slug: string;
    @Index('IDX_restaurant_slug_aliases_restaurant')
    @Column({ type: 'uuid' })
    restaurantId: string;
    @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'restaurant_id',
        foreignKeyConstraintName: 'FK_restaurant_slug_aliases_restaurant'
    })
    restaurant?: Restaurant;
    @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
