import { MigrationInterface, QueryRunner } from 'typeorm';

/** New restaurants start with no service fee and guests cannot refuse it; existing ones keep what they have. */
export class FeeDefaults1796000000000 implements MigrationInterface {
  name = 'FeeDefaults1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "restaurants" ALTER COLUMN "service_fee_bps" SET DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "restaurants" ALTER COLUMN "guest_fee_refusal" SET DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "restaurants" ALTER COLUMN "service_fee_bps" SET DEFAULT 1000`);
    await queryRunner.query(`ALTER TABLE "restaurants" ALTER COLUMN "guest_fee_refusal" SET DEFAULT true`);
  }
}
