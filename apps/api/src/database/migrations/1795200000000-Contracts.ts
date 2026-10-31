import { MigrationInterface, QueryRunner } from 'typeorm';

export class Contracts1795200000000 implements MigrationInterface {
  name = 'Contracts1795200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "contracts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "restaurant_id" uuid NOT NULL,
        "kind" character varying(20) NOT NULL,
        "origin" character varying(20) NOT NULL,
        "previous_id" uuid,
        "signed_on" date NOT NULL,
        "starts_on" date NOT NULL,
        "ends_on" date NOT NULL,
        "signatory_name" character varying(80) NOT NULL,
        "signatory_role" character varying(80) NOT NULL,
        "signatory_contact" character varying(120) NOT NULL,
        "document_id" uuid NOT NULL,
        "created_by" character varying(80) NOT NULL,
        "created_by_name" character varying(120) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contracts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contracts_restaurant" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_contracts_document" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_contracts_restaurant" ON "contracts" ("restaurant_id")`);
    // Restaurants that exist today have no contract on file: they stay pending until one is registered.
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "trial_days" integer NOT NULL DEFAULT 0, ADD "contract_starts_on" date, ADD "contract_ends_on" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "contract_ends_on", DROP COLUMN "contract_starts_on", DROP COLUMN "trial_days"`);
    await queryRunner.query(`DROP TABLE "contracts"`);
  }
}
