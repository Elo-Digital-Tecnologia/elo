import { MigrationInterface, QueryRunner } from 'typeorm';

/** Motivo do encerramento da sessão do cliente (encerrada pelo garçom, recusada ou assumida por outro aparelho). */
export class SessionClosedReason1793700000000 implements MigrationInterface {
  name = 'SessionClosedReason1793700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_sessions" ADD "closed_reason" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_sessions" DROP COLUMN "closed_reason"`);
  }
}
