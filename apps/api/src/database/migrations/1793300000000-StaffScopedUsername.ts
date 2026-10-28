import { MigrationInterface, QueryRunner } from 'typeorm';

/** Usuário passa a ser único por restaurante (e entre a equipe Elo), não mais no sistema todo. */
export class StaffScopedUsername1793300000000 implements MigrationInterface {
  name = 'StaffScopedUsername1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "staff_users" DROP CONSTRAINT "UQ_975b4ddfa7b30b64ac26cefbad0"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_staff_restaurant_username" ON "staff_users" ("restaurant_id", "username") WHERE "restaurant_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_staff_elo_username" ON "staff_users" ("username") WHERE "restaurant_id" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_staff_elo_username"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_staff_restaurant_username"`);
    await queryRunner.query(`ALTER TABLE "staff_users" ADD CONSTRAINT "UQ_975b4ddfa7b30b64ac26cefbad0" UNIQUE ("username")`);
  }
}
