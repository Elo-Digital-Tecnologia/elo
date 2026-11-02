import { MigrationInterface, QueryRunner } from 'typeorm';

/** Old links of a restaurant whose link changed: they keep leading to it. */
export class SlugAliases1795700000000 implements MigrationInterface {
  name = 'SlugAliases1795700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "restaurant_slug_aliases" (
        "slug" character varying(60) NOT NULL,
        "restaurant_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_restaurant_slug_aliases" PRIMARY KEY ("slug"),
        CONSTRAINT "FK_restaurant_slug_aliases_restaurant" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_restaurant_slug_aliases_restaurant" ON "restaurant_slug_aliases" ("restaurant_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "restaurant_slug_aliases"`);
  }
}
