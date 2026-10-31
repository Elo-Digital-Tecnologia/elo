import { MigrationInterface, QueryRunner } from 'typeorm';

export class BillingPlans1794400000000 implements MigrationInterface {
  name = 'BillingPlans1794400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(60) NOT NULL, "price_cents" integer NOT NULL, "cycle_months" integer NOT NULL DEFAULT 1, "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_plans" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "plan_id" uuid`);
    await queryRunner.query(`ALTER TABLE "restaurants" ADD CONSTRAINT "FK_restaurants_plan" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "initial_due_date" TIMESTAMP WITH TIME ZONE`);
    // Restaurants from before the billing history keep their current due date as the starting point.
    await queryRunner.query(`UPDATE "restaurants" SET "initial_due_date" = "due_date"`);
    await queryRunner.query(`ALTER TABLE "restaurants" ALTER COLUMN "initial_due_date" SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE "payments" ADD "kind" character varying NOT NULL DEFAULT 'payment'`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "expected_cents" integer`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "period_start" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "plan_id" uuid`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "plan_name" character varying(60)`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "cycles" integer`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "voided_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "voided_by" character varying`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "voided_by_name" character varying`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "void_reason" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of ['void_reason', 'voided_by_name', 'voided_by', 'voided_at', 'cycles', 'plan_name', 'plan_id', 'period_start', 'expected_cents', 'kind']) {
      await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "${column}"`);
    }
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "initial_due_date"`);
    await queryRunner.query(`ALTER TABLE "restaurants" DROP CONSTRAINT "FK_restaurants_plan"`);
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "plan_id"`);
    await queryRunner.query(`DROP TABLE "plans"`);
  }
}
