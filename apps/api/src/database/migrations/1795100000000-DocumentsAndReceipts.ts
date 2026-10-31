import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentsAndReceipts1795100000000 implements MigrationInterface {
  name = 'DocumentsAndReceipts1795100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "restaurant_id" uuid NOT NULL,
        "kind" character varying(20) NOT NULL,
        "original_name" character varying(120) NOT NULL,
        "mime" character varying(40) NOT NULL,
        "bytes" integer NOT NULL,
        "sha256" character varying(64) NOT NULL,
        "uploaded_by" character varying(80) NOT NULL,
        "uploaded_by_name" character varying(120) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_documents_restaurant" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_documents_restaurant" ON "documents" ("restaurant_id")`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "receipt_id" uuid, ADD "no_receipt_reason" character varying(300)`);
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_receipt" FOREIGN KEY ("receipt_id") REFERENCES "documents"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_payments_receipt" ON "payments" ("receipt_id") WHERE "receipt_id" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_payments_receipt"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_receipt"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "no_receipt_reason", DROP COLUMN "receipt_id"`);
    await queryRunner.query(`DROP TABLE "documents"`);
  }
}
