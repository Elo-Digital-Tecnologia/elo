import { TableState } from '@elo/core/tables/table-state';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dining_tables')
export class DiningTableEntity {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Index()
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @Column({ name: 'name', type: 'varchar', length: 40 })
    public name: string;

    /** Permanent, long and random token. The table number never shows in the URL. */
    @Column({ name: 'token', type: 'varchar', unique: true })
    public token: string;

    @Column({ name: 'state', type: 'varchar', default: 'closed' })
    public state: TableState;

    /** Waiter who validated the opening (serves the table). */
    @Column({ name: 'waiter_id', type: 'uuid', nullable: true })
    public waiterId: string | null;
}
