import { MigrationInterface, QueryRunner } from 'typeorm';

/** Perfil público do restaurante, destaques/etiquetas/ordem dos produtos e avaliações. */
export class ProfileTagsReviews1793600000000 implements MigrationInterface {
  name = 'ProfileTagsReviews1793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "description" text`);
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "logo_url" text`);
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "cover_url" text`);
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "address" text`);
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "phone" character varying(30)`);
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "instagram" character varying(40)`);
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "wifi_name" character varying(60)`);
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "wifi_password" character varying(80)`);
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "opening_hours" jsonb`);

    await queryRunner.query(`ALTER TABLE "products" ADD "featured" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "products" ADD "tags" text array NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "products" ADD "position" integer NOT NULL DEFAULT 0`);

    await queryRunner.query(
      `CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurant_id" uuid NOT NULL, "session_id" uuid NOT NULL, "table_name" character varying(120) NOT NULL, "stars" integer NOT NULL, "comment" character varying(300), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_reviews" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_reviews_restaurant" ON "reviews" ("restaurant_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_reviews_session" ON "reviews" ("session_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_session"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_restaurant"`);
    await queryRunner.query(`DROP TABLE "reviews"`);
    for (const c of ['position', 'tags', 'featured']) await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "${c}"`);
    for (const c of ['opening_hours', 'wifi_password', 'wifi_name', 'instagram', 'phone', 'address', 'cover_url', 'logo_url', 'description']) {
      await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "${c}"`);
    }
  }
}
