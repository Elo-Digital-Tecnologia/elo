import { MigrationInterface, QueryRunner } from 'typeorm';

export class SingleRestaurantOwner1794700000000 implements MigrationInterface {
  name = 'SingleRestaurantOwner1794700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Restaurants with several administrators keep the oldest (active first) as owner; the others become managers.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT id, row_number() OVER (PARTITION BY restaurant_id ORDER BY active DESC, created_at ASC) AS n
        FROM "staff_users"
        WHERE restaurant_id IS NOT NULL AND deleted_at IS NULL AND 'restaurant_admin' = ANY(roles)
      )
      UPDATE "staff_users" u
      SET roles = array_prepend('manager', array_remove(array_remove(u.roles, 'restaurant_admin'), 'manager'))
      FROM ranked r
      WHERE u.id = r.id AND r.n > 1
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_staff_restaurant_owner" ON "staff_users" ("restaurant_id") WHERE "deleted_at" IS NULL AND 'restaurant_admin' = ANY("roles")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_staff_restaurant_owner"`);
  }
}
