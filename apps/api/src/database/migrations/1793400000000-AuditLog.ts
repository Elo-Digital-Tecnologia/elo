import { MigrationInterface, QueryRunner } from 'typeorm';

/** Registro de auditoria das ações sensíveis da equipe Elo. */
export class AuditLog1793400000000 implements MigrationInterface {
  name = 'AuditLog1793400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actor" character varying NOT NULL, "action" character varying NOT NULL, "restaurant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_audit_log" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_audit_log_restaurant" ON "audit_log" ("restaurant_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_restaurant"`);
    await queryRunner.query(`DROP TABLE "audit_log"`);
  }
}
