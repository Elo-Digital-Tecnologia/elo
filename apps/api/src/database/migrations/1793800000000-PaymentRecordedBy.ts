import { MigrationInterface, QueryRunner } from 'typeorm';

/** The superadmin has no user row, so `recorded_by` holds an actor id like `audit_log.actor`. */
export class PaymentRecordedBy1793800000000 implements MigrationInterface {
  name = 'PaymentRecordedBy1793800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "recorded_by" TYPE character varying USING "recorded_by"::text`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "recorded_by_name" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "recorded_by_name"`);
    await queryRunner.query(`DELETE FROM "payments" WHERE "recorded_by" !~ '^[0-9a-f-]{36}$'`);
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "recorded_by" TYPE uuid USING "recorded_by"::uuid`);
  }
}
