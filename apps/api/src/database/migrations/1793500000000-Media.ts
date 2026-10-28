import { MigrationInterface, QueryRunner } from 'typeorm';

/** Banco de imagens dos restaurantes. */
export class Media1793500000000 implements MigrationInterface {
  name = 'Media1793500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "media" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurant_id" uuid NOT NULL, "original_name" character varying(120) NOT NULL, "width" integer NOT NULL, "height" integer NOT NULL, "bytes" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_media" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_media_restaurant" ON "media" ("restaurant_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_media_restaurant"`);
    await queryRunner.query(`DROP TABLE "media"`);
  }
}
