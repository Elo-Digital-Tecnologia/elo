import type { PauseKind } from '@elo/core/opening-hours/open-status';
import type { Relation } from 'typeorm';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';

/**
 * A window over the opening hours: a temporary closure (no new tables; `endsAt` null
 * lasts until someone ends it) or an extra opening outside the hours (always with an end).
 */
@Entity('restaurant_pauses')
@Index('IDX_restaurant_pauses_restaurant_start', ['restaurantId', 'startsAt'])
export class RestaurantPauseEntity extends BaseEntity {
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @Column({ name: 'kind', type: 'varchar', length: 20, default: 'closure' })
    public kind: PauseKind;

    @ManyToOne(() => RestaurantEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'restaurant_id' })
    public restaurant?: Relation<RestaurantEntity> | undefined;

    @Column({ name: 'starts_at', type: 'timestamptz' })
    public startsAt: Date;

    @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
    public endsAt: Date | null;

    @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
    public endedAt: Date | null;

    @Column({ name: 'reason', type: 'varchar', length: 120, nullable: true })
    public reason: string | null;

    @Column({ name: 'created_by', type: 'varchar', length: 80 })
    public createdBy: string;

    @Column({ name: 'created_by_name', type: 'varchar', length: 120, nullable: true })
    public createdByName: string | null;
}
