import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';

/** Image from the restaurant's library. Files stay on disk, named after the id. */
@Entity('media')
export class MediaEntity extends BaseEntity {
    @Index()
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @Column({ name: 'original_name', type: 'varchar', length: 120 })
    public originalName: string;

    @Column({ name: 'width', type: 'int' })
    public width: number;

    @Column({ name: 'height', type: 'int' })
    public height: number;

    /** Tamanho do arquivo principal em bytes. */
    @Column({ name: 'bytes', type: 'int' })
    public bytes: number;
}
