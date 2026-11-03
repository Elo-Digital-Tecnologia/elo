import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Contracts become the only source of their coverage (no cached copy on the restaurant
 * that could go stale), can be voided, and carry the pilot's free trial.
 */
export class ContractsReview1795300000000 implements MigrationInterface {
    name = 'ContractsReview1795300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE "contracts"
        ADD "effective_ends_on" date,
        ADD "trial_days" integer NOT NULL DEFAULT 0,
        ADD "trial_ended_on" date,
        ADD "trial_end_reason" character varying(20),
        ADD "voided_at" TIMESTAMP WITH TIME ZONE,
        ADD "voided_by" character varying(80),
        ADD "voided_by_name" character varying(120),
        ADD "void_reason" character varying(300)
    `);
        await queryRunner.query(`UPDATE "contracts" SET "effective_ends_on" = "ends_on"`);
        await queryRunner.query(`
      UPDATE "contracts" p SET "effective_ends_on" = LEAST(p."ends_on", c."starts_on" - 1)
      FROM "contracts" c WHERE c."previous_id" = p."id" AND c."origin" = 'conversion'
    `);
        await queryRunner.query(
            `ALTER TABLE "contracts" ALTER COLUMN "effective_ends_on" SET NOT NULL`
        );
        await queryRunner.query(`
      UPDATE "contracts" c SET "trial_days" = r."trial_days"
      FROM "restaurants" r WHERE c."restaurant_id" = r."id" AND c."origin" = 'initial' AND c."kind" = 'pilot'
    `);
        await queryRunner.query(
            `ALTER TABLE "contracts" ADD CONSTRAINT "UQ_contracts_document" UNIQUE ("document_id")`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_contracts_coverage" ON "contracts" ("restaurant_id", "starts_on", "effective_ends_on") WHERE "voided_at" IS NULL`
        );
        await queryRunner.query(
            `ALTER TABLE "restaurants" DROP COLUMN "contract_starts_on", DROP COLUMN "contract_ends_on", DROP COLUMN "trial_days"`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "restaurants" ADD "trial_days" integer NOT NULL DEFAULT 0, ADD "contract_starts_on" date, ADD "contract_ends_on" date`
        );
        await queryRunner.query(`
      UPDATE "restaurants" r SET "trial_days" = c."trial_days"
      FROM "contracts" c WHERE c."restaurant_id" = r."id" AND c."origin" = 'initial' AND c."voided_at" IS NULL
    `);
        await queryRunner.query(`
      UPDATE "restaurants" r SET "contract_starts_on" = s."starts", "contract_ends_on" = s."ends"
      FROM (SELECT "restaurant_id", MIN("starts_on") AS "starts", MAX("effective_ends_on") AS "ends" FROM "contracts" WHERE "voided_at" IS NULL GROUP BY "restaurant_id") s
      WHERE s."restaurant_id" = r."id"
    `);
        await queryRunner.query(`DROP INDEX "IDX_contracts_coverage"`);
        await queryRunner.query(
            `ALTER TABLE "contracts" DROP CONSTRAINT "UQ_contracts_document"`
        );
        await queryRunner.query(`
      ALTER TABLE "contracts"
        DROP COLUMN "void_reason", DROP COLUMN "voided_by_name", DROP COLUMN "voided_by", DROP COLUMN "voided_at",
        DROP COLUMN "trial_end_reason", DROP COLUMN "trial_ended_on", DROP COLUMN "trial_days", DROP COLUMN "effective_ends_on"
    `);
    }
}
