import { MigrationInterface, QueryRunner } from 'typeorm';

export class GuestPushSubscriptions1794500000000 implements MigrationInterface {
  name = 'GuestPushSubscriptions1794500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "guest_push_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurant_id" uuid NOT NULL, "table_id" uuid NOT NULL, "session_id" uuid NOT NULL, "endpoint" text NOT NULL, "p256dh" character varying(120) NOT NULL, "auth" character varying(60) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_guest_push_subscriptions_endpoint" UNIQUE ("endpoint"), CONSTRAINT "PK_guest_push_subscriptions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_guest_push_subscriptions_restaurant" ON "guest_push_subscriptions" ("restaurant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_guest_push_subscriptions_table" ON "guest_push_subscriptions" ("table_id")`);
    await queryRunner.query(
      `ALTER TABLE "guest_push_subscriptions" ADD CONSTRAINT "FK_guest_push_subscriptions_session" FOREIGN KEY ("session_id") REFERENCES "table_sessions"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "guest_push_subscriptions"`);
  }
}
