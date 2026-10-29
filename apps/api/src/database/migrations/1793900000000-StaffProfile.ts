import { MigrationInterface, QueryRunner } from 'typeorm';

/** Team members get a name, several roles and archiving; table service records who handled what and when. */
export class StaffProfile1793900000000 implements MigrationInterface {
  name = 'StaffProfile1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "staff_users" ADD "name" character varying(80)`);
    await queryRunner.query(`UPDATE "staff_users" SET "name" = "username"`);
    await queryRunner.query(`ALTER TABLE "staff_users" ALTER COLUMN "name" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "staff_users" ADD "display_name" character varying(30)`);
    await queryRunner.query(`ALTER TABLE "staff_users" ADD "roles" text array`);
    await queryRunner.query(`UPDATE "staff_users" SET "roles" = ARRAY["role"]`);
    await queryRunner.query(`ALTER TABLE "staff_users" ALTER COLUMN "roles" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "staff_users" DROP COLUMN "role"`);
    await queryRunner.query(`ALTER TABLE "staff_users" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`DROP INDEX "public"."UQ_staff_restaurant_username"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_staff_elo_username"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_staff_restaurant_username" ON "staff_users" ("restaurant_id", "username") WHERE "restaurant_id" IS NOT NULL AND "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_staff_elo_username" ON "staff_users" ("username") WHERE "restaurant_id" IS NULL AND "deleted_at" IS NULL`,
    );

    await queryRunner.query(`ALTER TABLE "waiter_calls" ADD "resolved_by" uuid`);
    await queryRunner.query(`ALTER TABLE "table_sessions" ADD "open_requested_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "table_sessions" ADD "opened_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "table_sessions" ADD "opened_by" uuid`);
    await queryRunner.query(`ALTER TABLE "table_sessions" ADD "close_requested_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "table_sessions" ADD "closed_by" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['closed_by', 'close_requested_at', 'opened_by', 'opened_at', 'open_requested_at']) {
      await queryRunner.query(`ALTER TABLE "table_sessions" DROP COLUMN "${col}"`);
    }
    await queryRunner.query(`ALTER TABLE "waiter_calls" DROP COLUMN "resolved_by"`);
    await queryRunner.query(`DELETE FROM "staff_users" WHERE "deleted_at" IS NOT NULL`);
    await queryRunner.query(`DROP INDEX "public"."UQ_staff_elo_username"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_staff_restaurant_username"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_staff_restaurant_username" ON "staff_users" ("restaurant_id", "username") WHERE "restaurant_id" IS NOT NULL`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_staff_elo_username" ON "staff_users" ("username") WHERE "restaurant_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "staff_users" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "staff_users" ADD "role" character varying`);
    await queryRunner.query(`UPDATE "staff_users" SET "role" = "roles"[1]`);
    await queryRunner.query(`ALTER TABLE "staff_users" ALTER COLUMN "role" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "staff_users" DROP COLUMN "roles"`);
    await queryRunner.query(`ALTER TABLE "staff_users" DROP COLUMN "display_name"`);
    await queryRunner.query(`ALTER TABLE "staff_users" DROP COLUMN "name"`);
  }
}
