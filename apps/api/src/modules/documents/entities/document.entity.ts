import type { Relation } from 'typeorm';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';

/**
 * A private file the Elo team keeps for a restaurant (proof of payment, signed
 * contract). Stored outside the public media folder and served only to the team.
 */
@Entity('documents')
export class DocumentEntity extends BaseEntity {
    @Index()
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @ManyToOne(() => RestaurantEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'restaurant_id' })
    public restaurant?: Relation<RestaurantEntity> | undefined;

    @Column({ name: 'kind', type: 'varchar', length: 20 })
    public kind: 'receipt' | 'contract';

    @Column({ name: 'original_name', type: 'varchar', length: 120 })
    public originalName: string;

    @Column({ name: 'mime', type: 'varchar', length: 40 })
    public mime: string;

    @Column({ name: 'bytes', type: 'int' })
    public bytes: number;

    @Column({ name: 'sha256', type: 'varchar', length: 64 })
    public sha256: string;

    @Column({ name: 'uploaded_by', type: 'varchar', length: 80 })
    public uploadedBy: string;

    @Column({ name: 'uploaded_by_name', type: 'varchar', length: 120, nullable: true })
    public uploadedByName: string | null;
}
