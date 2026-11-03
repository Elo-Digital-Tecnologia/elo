import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Each contract keeps the plan and price it was signed with, and a mid-contract plan
 * change (amendment) keeps its own price on the restaurant: editing a plan's price no
 * longer changes what restaurants under contract pay.
 */
export class ContractPlans1795600000000 implements MigrationInterface {
    name = 'ContractPlans1795600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE "contracts"
        ADD "plan_id" uuid,
        ADD "plan_name" character varying(60),
        ADD "price_cents" integer,
        ADD "cycle_months" integer
    `);
        await queryRunner.query(`
      ALTER TABLE "restaurants"
        ADD "price_cents" integer,
        ADD "cycle_months" integer,
        ADD "plan_amended_at" TIMESTAMP WITH TIME ZONE
    `);
        await queryRunner.query(`
      UPDATE "contracts" c SET "plan_id" = p."id", "plan_name" = p."name", "price_cents" = p."price_cents", "cycle_months" = p."cycle_months"
      FROM "restaurants" r JOIN "plans" p ON p."id" = r."plan_id"
      WHERE c."restaurant_id" = r."id"
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "restaurants" DROP COLUMN "plan_amended_at", DROP COLUMN "cycle_months", DROP COLUMN "price_cents"`
        );
        await queryRunner.query(
            `ALTER TABLE "contracts" DROP COLUMN "cycle_months", DROP COLUMN "price_cents", DROP COLUMN "plan_name", DROP COLUMN "plan_id"`
        );
    }
}
