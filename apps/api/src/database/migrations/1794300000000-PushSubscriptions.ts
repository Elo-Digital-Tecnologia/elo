import { MigrationInterface, QueryRunner } from 'typeorm';

export class PushSubscriptions1794300000000 implements MigrationInterface {
  name = 'PushSubscriptions1794300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "push_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurant_id" uuid NOT NULL, "staff_id" uuid NOT NULL, "endpoint" text NOT NULL, "p256dh" character varying(120) NOT NULL, "auth" character varying(60) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_push_subscriptions_endpoint" UNIQUE ("endpoint"), CONSTRAINT "PK_push_subscriptions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_push_subscriptions_restaurant" ON "push_subscriptions" ("restaurant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_push_subscriptions_staff" ON "push_subscriptions" ("staff_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "push_subscriptions"`);
  }
}
