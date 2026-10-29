import { MigrationInterface, QueryRunner } from 'typeorm';

/** The audit log becomes the restaurant's activity log: actor name and kind, target and details. */
export class ActivityLog1794200000000 implements MigrationInterface {
  name = 'ActivityLog1794200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_log" ADD "actor_name" character varying`);
    await queryRunner.query(`ALTER TABLE "audit_log" ADD "actor_kind" character varying`);
    await queryRunner.query(`ALTER TABLE "audit_log" ADD "target" character varying`);
    await queryRunner.query(`ALTER TABLE "audit_log" ADD "meta" jsonb`);
    await queryRunner.query(`UPDATE "audit_log" SET "actor_kind" = CASE WHEN "actor" = 'system' THEN 'system' ELSE 'elo' END`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_log_restaurant_created" ON "audit_log" ("restaurant_id", "created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_restaurant_created"`);
    for (const col of ['meta', 'target', 'actor_kind', 'actor_name']) {
      await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "${col}"`);
    }
  }
}
