import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1793816327467 implements MigrationInterface {
    name = 'Init1793816327467';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "table_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "restaurant_id" uuid NOT NULL, "table_id" uuid NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "closed_at" TIMESTAMP WITH TIME ZONE, "closed_reason" character varying, "open_requested_at" TIMESTAMP WITH TIME ZONE, "opened_at" TIMESTAMP WITH TIME ZONE, "opened_by" uuid, "close_requested_at" TIMESTAMP WITH TIME ZONE, "closed_by" uuid, "fee_waived_by" character varying, "adjustments" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_41bb063768931e959eb1f86daa3" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_73328bc5dcedce124fa829375b" ON "table_sessions" ("table_id") `
        );
        await queryRunner.query(
            `CREATE TABLE "staff_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "restaurant_id" uuid, "username" character varying NOT NULL, "name" character varying(80) NOT NULL, "display_name" character varying(30), "avatar_url" character varying(120), "password_hash" character varying NOT NULL, "roles" text array NOT NULL, "permissions" text array NOT NULL DEFAULT '{}', "active" boolean NOT NULL DEFAULT true, "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_c6b167335377df69f7910c2c75e" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_66e0ea261c30ced8d28c037a3d" ON "staff_users" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_staff_restaurant_owner" ON "staff_users" ("restaurant_id") WHERE "deleted_at" IS NULL AND 'restaurant_admin' = ANY("roles")`
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_staff_elo_username" ON "staff_users" ("username") WHERE "restaurant_id" IS NULL AND "deleted_at" IS NULL`
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_staff_restaurant_username" ON "staff_users" ("restaurant_id", "username") WHERE "restaurant_id" IS NOT NULL AND "deleted_at" IS NULL`
        );
        await queryRunner.query(
            `CREATE TABLE "staff_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, "scope" character varying(90) NOT NULL, "token_hash" character varying(64) NOT NULL, "credential_tag" character varying(32) NOT NULL, "user_agent" character varying(200), "last_used_at" TIMESTAMP WITH TIME ZONE NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_staff_sessions_token_hash" UNIQUE ("token_hash"), CONSTRAINT "PK_b9be2467392ab95efaa3661cce2" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_staff_sessions_user_id" ON "staff_sessions" ("user_id") `
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_staff_sessions_expires_at" ON "staff_sessions" ("expires_at") `
        );
        await queryRunner.query(
            `CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "restaurant_id" uuid NOT NULL, "session_id" uuid NOT NULL, "table_name" character varying(120) NOT NULL, "stars" integer NOT NULL, "comment" character varying(300), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_2269110d10df8d494b99e1381d" ON "reviews" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "IDX_ecbc75cbb93e18a8835aae7820" ON "reviews" ("session_id") `
        );
        await queryRunner.query(
            `CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(60) NOT NULL, "price_cents" integer NOT NULL, "cycle_months" integer NOT NULL DEFAULT '1', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE TABLE "restaurants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "slug" character varying(60) NOT NULL, "name" character varying(120) NOT NULL, "manager_name" character varying(80) NOT NULL, "manager_contact" character varying(120) NOT NULL, "due_date" TIMESTAMP WITH TIME ZONE NOT NULL, "initial_due_date" TIMESTAMP WITH TIME ZONE NOT NULL, "plan_id" uuid, "price_cents" integer, "cycle_months" integer, "plan_amended_at" TIMESTAMP WITH TIME ZONE, "suspended" boolean NOT NULL DEFAULT false, "service_fee_bps" integer NOT NULL DEFAULT '0', "guest_fee_refusal" boolean NOT NULL DEFAULT false, "description" text, "logo_url" text, "cover_url" text, "address" text, "phone" character varying(30), "instagram" character varying(40), "wifi_name" character varying(32), "wifi_password" character varying(63), "google_review_url" character varying(500), "opening_hours" jsonb, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" character varying, CONSTRAINT "UQ_afb6330c019768b4c3f9a65303c" UNIQUE ("slug"), CONSTRAINT "PK_e2133a72eb1cc8f588f7b503e68" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_restaurants_deleted_at" ON "restaurants" ("deleted_at") WHERE deleted_at IS NOT NULL`
        );
        await queryRunner.query(
            `CREATE TABLE "restaurant_slug_aliases" ("slug" character varying(60) NOT NULL, "restaurant_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f14b0b0cbe5a8e195404a518395" PRIMARY KEY ("slug"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_restaurant_slug_aliases_restaurant" ON "restaurant_slug_aliases" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE TABLE "dining_tables" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurant_id" uuid NOT NULL, "name" character varying(40) NOT NULL, "token" character varying NOT NULL, "state" character varying NOT NULL DEFAULT 'closed', "waiter_id" uuid, CONSTRAINT "UQ_416c2d19db5904b65e66cf94aae" UNIQUE ("token"), CONSTRAINT "PK_30bc22c71f39a9d32b7f7617757" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_5376948f0c5b15f4f67d6d62d9" ON "dining_tables" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE TABLE "push_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "restaurant_id" uuid NOT NULL, "staff_id" uuid NOT NULL, "endpoint" text NOT NULL, "p256dh" character varying(120) NOT NULL, "auth" character varying(60) NOT NULL, CONSTRAINT "UQ_0008bdfd174e533a3f98bf9af16" UNIQUE ("endpoint"), CONSTRAINT "PK_757fc8f00c34f66832668dc2e53" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_3715747d0104751000bb205268" ON "push_subscriptions" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_81a8eeaee3d44ac752b48409fc" ON "push_subscriptions" ("staff_id") `
        );
        await queryRunner.query(
            `CREATE TABLE "guest_push_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "restaurant_id" uuid NOT NULL, "table_id" uuid NOT NULL, "session_id" uuid NOT NULL, "endpoint" text NOT NULL, "p256dh" character varying(120) NOT NULL, "auth" character varying(60) NOT NULL, CONSTRAINT "UQ_7a0152a567c0f4ce62372ce9c81" UNIQUE ("endpoint"), CONSTRAINT "PK_47c25a1d512f1de389e1baea6d4" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_d7977a94913a55a928a5457076" ON "guest_push_subscriptions" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_52cc99d415688814e407bd3f79" ON "guest_push_subscriptions" ("table_id") `
        );
        await queryRunner.query(
            `CREATE TABLE "restaurant_pauses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "restaurant_id" uuid NOT NULL, "kind" character varying(20) NOT NULL DEFAULT 'closure', "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ends_at" TIMESTAMP WITH TIME ZONE, "ended_at" TIMESTAMP WITH TIME ZONE, "reason" character varying(120), "created_by" character varying(80) NOT NULL, "created_by_name" character varying(120), CONSTRAINT "PK_c61875955d013ce72ffe0f6c053" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_restaurant_pauses_restaurant_start" ON "restaurant_pauses" ("restaurant_id", "starts_at") `
        );
        await queryRunner.query(
            `CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "restaurant_id" uuid NOT NULL, "kind" character varying(20) NOT NULL, "original_name" character varying(120) NOT NULL, "mime" character varying(40) NOT NULL, "bytes" integer NOT NULL, "sha256" character varying(64) NOT NULL, "uploaded_by" character varying(80) NOT NULL, "uploaded_by_name" character varying(120), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_68c6ef1cf14cec54d7d8d0ddab" ON "documents" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "restaurant_id" uuid NOT NULL, "table_id" uuid NOT NULL, "session_id" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'sent', "items" jsonb NOT NULL, "cancel_reason" text, CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_85fdda5fcce2f397ef8f117a2c" ON "orders" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_3d36410e89a795172fa6e0dd96" ON "orders" ("table_id") `
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_orders_restaurant_status_created" ON "orders" ("restaurant_id", "status", "created_at") `
        );
        await queryRunner.query(
            `CREATE TABLE "media" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "restaurant_id" uuid NOT NULL, "original_name" character varying(120) NOT NULL, "width" integer NOT NULL, "height" integer NOT NULL, "bytes" integer NOT NULL, CONSTRAINT "PK_f4e0fcac36e050de337b670d8bd" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_66a647deee9b6e070a558aec76" ON "media" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurant_id" uuid NOT NULL, "category_id" uuid NOT NULL, "name" character varying(120) NOT NULL, "description" text, "price_cents" integer NOT NULL, "image_url" text, "available" boolean NOT NULL DEFAULT true, "featured" boolean NOT NULL DEFAULT false, "tags" text array NOT NULL DEFAULT '{}', "position" integer NOT NULL DEFAULT '0', "options" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_81ac8c38c90887ea5f4a8d160d" ON "products" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurant_id" uuid NOT NULL, "name" character varying(80) NOT NULL, "position" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_5afdea164dc28f2c02370eedb4" ON "categories" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE TABLE "waiter_calls" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "restaurant_id" uuid NOT NULL, "table_id" uuid NOT NULL, "resolved_at" TIMESTAMP WITH TIME ZONE, "resolved_by" uuid, CONSTRAINT "PK_55c3174780895bccafc7e136fcc" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_72ff251c4e0bd76bc32bd297c9" ON "waiter_calls" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE TABLE "contracts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "restaurant_id" uuid NOT NULL, "kind" character varying(20) NOT NULL, "origin" character varying(20) NOT NULL, "previous_id" uuid, "signed_on" date NOT NULL, "starts_on" date NOT NULL, "ends_on" date NOT NULL, "effective_ends_on" date NOT NULL, "trial_days" integer NOT NULL DEFAULT '0', "trial_ended_on" date, "trial_end_reason" character varying(20), "plan_id" uuid, "plan_name" character varying(60), "price_cents" integer, "cycle_months" integer, "signatory_name" character varying(80) NOT NULL, "signatory_role" character varying(80) NOT NULL, "signatory_contact" character varying(120) NOT NULL, "document_id" uuid NOT NULL, "created_by" character varying(80) NOT NULL, "created_by_name" character varying(120), "voided_at" TIMESTAMP WITH TIME ZONE, "voided_by" character varying(80), "voided_by_name" character varying(120), "void_reason" character varying(300), CONSTRAINT "UQ_contracts_document" UNIQUE ("document_id"), CONSTRAINT "PK_2c7b8f3a7b1acdd49497d83d0fb" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_d67487076fa20c47516fbc44c3" ON "contracts" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_contracts_coverage" ON "contracts" ("restaurant_id", "starts_on", "effective_ends_on") WHERE "voided_at" IS NULL`
        );
        await queryRunner.query(
            `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "restaurant_id" uuid NOT NULL, "kind" character varying NOT NULL DEFAULT 'payment', "amount_cents" integer NOT NULL, "expected_cents" integer, "paid_at" TIMESTAMP WITH TIME ZONE NOT NULL, "period_start" TIMESTAMP WITH TIME ZONE, "new_due_date" TIMESTAMP WITH TIME ZONE NOT NULL, "plan_id" uuid, "plan_name" character varying(60), "cycles" integer, "note" text, "recorded_by" character varying NOT NULL, "recorded_by_name" character varying, "voided_at" TIMESTAMP WITH TIME ZONE, "voided_by" character varying, "voided_by_name" character varying, "void_reason" text, "receipt_id" uuid, "no_receipt_reason" character varying(300), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_d19273a0dd01a303a5d8fcba58" ON "payments" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_payments_receipt" ON "payments" ("receipt_id") WHERE "receipt_id" IS NOT NULL`
        );
        await queryRunner.query(
            `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actor" character varying NOT NULL, "actor_name" character varying, "actor_kind" character varying, "action" character varying NOT NULL, "restaurant_id" uuid, "target" character varying, "meta" jsonb, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_634c30c6d43467c124de7e63fb" ON "audit_logs" ("restaurant_id") `
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_audit_log_restaurant_created" ON "audit_logs" ("restaurant_id", "created_at") `
        );
        await queryRunner.query(
            `ALTER TABLE "staff_sessions" ADD CONSTRAINT "FK_staff_sessions_user" FOREIGN KEY ("user_id") REFERENCES "staff_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "restaurants" ADD CONSTRAINT "FK_a473044315a3fc4d8a27629c650" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "restaurant_slug_aliases" ADD CONSTRAINT "FK_restaurant_slug_aliases_restaurant" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "guest_push_subscriptions" ADD CONSTRAINT "FK_1e9dfbf215f1d3fcd076946de6d" FOREIGN KEY ("session_id") REFERENCES "table_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "restaurant_pauses" ADD CONSTRAINT "FK_52ac96fd8902c5981299a4b3fd2" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "documents" ADD CONSTRAINT "FK_68c6ef1cf14cec54d7d8d0ddab7" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "contracts" ADD CONSTRAINT "FK_d67487076fa20c47516fbc44c31" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "contracts" ADD CONSTRAINT "FK_9d437e9a51ddb34d536ee8b03e0" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "payments" ADD CONSTRAINT "FK_3c2052846a7222366ddab8a5faa" FOREIGN KEY ("receipt_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "payments" DROP CONSTRAINT "FK_3c2052846a7222366ddab8a5faa"`
        );
        await queryRunner.query(
            `ALTER TABLE "contracts" DROP CONSTRAINT "FK_9d437e9a51ddb34d536ee8b03e0"`
        );
        await queryRunner.query(
            `ALTER TABLE "contracts" DROP CONSTRAINT "FK_d67487076fa20c47516fbc44c31"`
        );
        await queryRunner.query(
            `ALTER TABLE "documents" DROP CONSTRAINT "FK_68c6ef1cf14cec54d7d8d0ddab7"`
        );
        await queryRunner.query(
            `ALTER TABLE "restaurant_pauses" DROP CONSTRAINT "FK_52ac96fd8902c5981299a4b3fd2"`
        );
        await queryRunner.query(
            `ALTER TABLE "guest_push_subscriptions" DROP CONSTRAINT "FK_1e9dfbf215f1d3fcd076946de6d"`
        );
        await queryRunner.query(
            `ALTER TABLE "restaurant_slug_aliases" DROP CONSTRAINT "FK_restaurant_slug_aliases_restaurant"`
        );
        await queryRunner.query(
            `ALTER TABLE "restaurants" DROP CONSTRAINT "FK_a473044315a3fc4d8a27629c650"`
        );
        await queryRunner.query(
            `ALTER TABLE "staff_sessions" DROP CONSTRAINT "FK_staff_sessions_user"`
        );
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_restaurant_created"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_634c30c6d43467c124de7e63fb"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_payments_receipt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d19273a0dd01a303a5d8fcba58"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_contracts_coverage"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d67487076fa20c47516fbc44c3"`);
        await queryRunner.query(`DROP TABLE "contracts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_72ff251c4e0bd76bc32bd297c9"`);
        await queryRunner.query(`DROP TABLE "waiter_calls"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5afdea164dc28f2c02370eedb4"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_81ac8c38c90887ea5f4a8d160d"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_66a647deee9b6e070a558aec76"`);
        await queryRunner.query(`DROP TABLE "media"`);
        await queryRunner.query(
            `DROP INDEX "public"."IDX_orders_restaurant_status_created"`
        );
        await queryRunner.query(`DROP INDEX "public"."IDX_3d36410e89a795172fa6e0dd96"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_85fdda5fcce2f397ef8f117a2c"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_68c6ef1cf14cec54d7d8d0ddab"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(
            `DROP INDEX "public"."IDX_restaurant_pauses_restaurant_start"`
        );
        await queryRunner.query(`DROP TABLE "restaurant_pauses"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_52cc99d415688814e407bd3f79"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d7977a94913a55a928a5457076"`);
        await queryRunner.query(`DROP TABLE "guest_push_subscriptions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_81a8eeaee3d44ac752b48409fc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3715747d0104751000bb205268"`);
        await queryRunner.query(`DROP TABLE "push_subscriptions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5376948f0c5b15f4f67d6d62d9"`);
        await queryRunner.query(`DROP TABLE "dining_tables"`);
        await queryRunner.query(
            `DROP INDEX "public"."IDX_restaurant_slug_aliases_restaurant"`
        );
        await queryRunner.query(`DROP TABLE "restaurant_slug_aliases"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_restaurants_deleted_at"`);
        await queryRunner.query(`DROP TABLE "restaurants"`);
        await queryRunner.query(`DROP TABLE "plans"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ecbc75cbb93e18a8835aae7820"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2269110d10df8d494b99e1381d"`);
        await queryRunner.query(`DROP TABLE "reviews"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_staff_sessions_expires_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_staff_sessions_user_id"`);
        await queryRunner.query(`DROP TABLE "staff_sessions"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_staff_restaurant_username"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_staff_elo_username"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_staff_restaurant_owner"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_66e0ea261c30ced8d28c037a3d"`);
        await queryRunner.query(`DROP TABLE "staff_users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_73328bc5dcedce124fa829375b"`);
        await queryRunner.query(`DROP TABLE "table_sessions"`);
    }
}
