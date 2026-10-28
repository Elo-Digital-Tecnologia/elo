import { MigrationInterface, QueryRunner } from 'typeorm';

/** Conta da mesa (taxa recusada/removida e ajustes) e índice de listagem de pedidos. */
export class Billing1793200000000 implements MigrationInterface {
  name = 'Billing1793200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_sessions" ADD "fee_waived_by" character varying`);
    await queryRunner.query(`ALTER TABLE "table_sessions" ADD "adjustments" jsonb NOT NULL DEFAULT '[]'`);
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_restaurant_status_created" ON "orders" ("restaurant_id", "status", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_restaurant_status_created"`);
    await queryRunner.query(`ALTER TABLE "table_sessions" DROP COLUMN "adjustments"`);
    await queryRunner.query(`ALTER TABLE "table_sessions" DROP COLUMN "fee_waived_by"`);
  }
}
