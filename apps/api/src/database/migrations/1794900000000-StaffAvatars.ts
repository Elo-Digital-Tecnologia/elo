import { MigrationInterface, QueryRunner } from 'typeorm';

export class StaffAvatars1794900000000 implements MigrationInterface {
  name = 'StaffAvatars1794900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "staff_users" ADD "avatar_url" character varying(120)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "staff_users" DROP COLUMN "avatar_url"`);
  }
}
