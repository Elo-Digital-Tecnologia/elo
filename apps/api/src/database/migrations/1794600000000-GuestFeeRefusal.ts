import { MigrationInterface, QueryRunner } from 'typeorm';

export class GuestFeeRefusal1794600000000 implements MigrationInterface {
  name = 'GuestFeeRefusal1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guests could always refuse the fee until now; existing restaurants keep that.
    await queryRunner.query(`ALTER TABLE "restaurants" ADD "guest_fee_refusal" boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "guest_fee_refusal"`);
  }
}
