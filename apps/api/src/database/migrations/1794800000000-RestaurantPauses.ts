import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestaurantPauses1794800000000 implements MigrationInterface {
  name = 'RestaurantPauses1794800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "restaurant_pauses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "restaurant_id" uuid NOT NULL,
        "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ends_at" TIMESTAMP WITH TIME ZONE,
        "ended_at" TIMESTAMP WITH TIME ZONE,
        "reason" character varying(120),
        "created_by" character varying(80) NOT NULL,
        "created_by_name" character varying(120) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_restaurant_pauses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_restaurant_pauses_restaurant" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_restaurant_pauses_restaurant_start" ON "restaurant_pauses" ("restaurant_id", "starts_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "restaurant_pauses"`);
  }
}
