import { CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

/** Columns every restaurant-owned record has: a uuid key and its creation time. */
export abstract class BaseEntity {
    @PrimaryGeneratedColumn('uuid', { name: 'id' })
    public id: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    public createdAt: Date;
}
