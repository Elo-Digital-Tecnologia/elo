import { Column, Entity } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';

/** Subscription plan sold by Elo Digital. A plan in use is deactivated, never deleted. */
@Entity('plans')
export class PlanEntity extends BaseEntity {
    @Column({ name: 'name', type: 'varchar', length: 60 })
    public name: string;

    @Column({ name: 'price_cents', type: 'int' })
    public priceCents: number;

    @Column({ name: 'cycle_months', type: 'int', default: 1 })
    public cycleMonths: number;

    @Column({ name: 'active', type: 'boolean', default: true })
    public active: boolean;
}
