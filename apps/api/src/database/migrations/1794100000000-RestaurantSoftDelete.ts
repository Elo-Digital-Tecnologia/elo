import { MigrationInterface, QueryRunner } from 'typeorm';

/** Deleted restaurants are kept for a while (restore or export) before being erased. */
export class RestaurantSoftDelete1794100000000 implements MigrationInterface {
  name = 'RestaurantSoftDelete1794100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "deleted_by" character varying`);
    await queryRunner.query(`CREATE INDEX "IDX_restaurants_deleted_at" ON "restaurants" ("deleted_at") WHERE "deleted_at" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_restaurants_deleted_at"`);
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "deleted_by"`);
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "deleted_at"`);
  }
}
