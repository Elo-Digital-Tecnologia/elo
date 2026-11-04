import { Role } from '@elo/core/roles/roles';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';

@Entity('staff_users')
@Index('UQ_staff_restaurant_username', ['restaurantId', 'username'], {
    unique: true,
    where: '"restaurant_id" IS NOT NULL AND "deleted_at" IS NULL'
})
@Index('UQ_staff_elo_username', ['username'], {
    unique: true,
    where: '"restaurant_id" IS NULL AND "deleted_at" IS NULL'
})
/** One owner (administrator) per restaurant. */
@Index('UQ_staff_restaurant_owner', ['restaurantId'], {
    unique: true,
    where: `"deleted_at" IS NULL AND 'restaurant_admin' = ANY("roles")`
})
export class StaffUserEntity extends BaseEntity {
    /** Null for the Elo Digital team. */
    @Index()
    @Column({ name: 'restaurant_id', type: 'uuid', nullable: true })
    public restaurantId: string | null;

    /** Unique among the non-archived accounts of the restaurant (or of the Elo team). */
    @Column({ name: 'username', type: 'varchar' })
    public username: string;

    @Column({ name: 'name', type: 'varchar', length: 80 })
    public name: string;

    /** Name shown to guests ("Ana vai até a sua mesa"). */
    @Column({ name: 'display_name', type: 'varchar', length: 30, nullable: true })
    public displayName: string | null;

    /** Optional profile photo, shown to the team only (never to guests). */
    @Column({ name: 'avatar_url', type: 'varchar', length: 120, nullable: true })
    public avatarUrl: string | null;

    @Column({ name: 'password_hash', type: 'varchar' })
    public passwordHash: string;

    @Column({ name: 'roles', type: 'text', array: true })
    public roles: Role[];

    @Column({ name: 'permissions', type: 'text', array: true, default: '{}' })
    public permissions: string[];

    @Column({ name: 'active', type: 'boolean', default: true })
    public active: boolean;

    /** Archived accounts keep their history (calls, tables, payments) but can no longer sign in. */
    @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    public deletedAt: Date | null;
}
