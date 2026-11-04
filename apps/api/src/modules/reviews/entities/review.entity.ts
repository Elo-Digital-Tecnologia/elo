import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';

/** Service review. One per table session; no name or phone. */
@Entity('reviews')
export class ReviewEntity extends BaseEntity {
    @Index()
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @Index({ unique: true })
    @Column({ name: 'session_id', type: 'uuid' })
    public sessionId: string;

    @Column({ name: 'table_name', type: 'varchar', length: 120 })
    public tableName: string;

    @Column({ name: 'stars', type: 'int' })
    public stars: number;

    @Column({ name: 'comment', type: 'varchar', length: 300, nullable: true })
    public comment: string | null;
}
