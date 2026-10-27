import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1793064002075 implements MigrationInterface {
    name = 'Init1793064002075'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "restaurants" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "slug" character varying NOT NULL,
                "name" character varying NOT NULL,
                "manager_name" character varying NOT NULL,
                "manager_contact" character varying NOT NULL,
                "due_date" TIMESTAMP WITH TIME ZONE NOT NULL,
                "suspended" boolean NOT NULL DEFAULT false,
                "service_fee_bps" integer NOT NULL DEFAULT '1000',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_afb6330c019768b4c3f9a65303c" UNIQUE ("slug"),
                CONSTRAINT "PK_e2133a72eb1cc8f588f7b503e68" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "staff_users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "restaurant_id" uuid,
                "username" character varying NOT NULL,
                "password_hash" character varying NOT NULL,
                "role" character varying NOT NULL,
                "permissions" text array NOT NULL DEFAULT '{}',
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_975b4ddfa7b30b64ac26cefbad0" UNIQUE ("username"),
                CONSTRAINT "PK_c6b167335377df69f7910c2c75e" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_66e0ea261c30ced8d28c037a3d" ON "staff_users" ("restaurant_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "payments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "restaurant_id" uuid NOT NULL,
                "amount_cents" integer NOT NULL,
                "paid_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "new_due_date" TIMESTAMP WITH TIME ZONE NOT NULL,
                "note" text,
                "recorded_by" uuid NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d19273a0dd01a303a5d8fcba58" ON "payments" ("restaurant_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "restaurant_id" uuid NOT NULL,
                "name" character varying NOT NULL,
                "position" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_5afdea164dc28f2c02370eedb4" ON "categories" ("restaurant_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "products" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "restaurant_id" uuid NOT NULL,
                "category_id" uuid NOT NULL,
                "name" character varying NOT NULL,
                "description" text,
                "price_cents" integer NOT NULL,
                "image_url" text,
                "available" boolean NOT NULL DEFAULT true,
                "options" jsonb NOT NULL DEFAULT '[]',
                CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_81ac8c38c90887ea5f4a8d160d" ON "products" ("restaurant_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "dining_tables" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "restaurant_id" uuid NOT NULL,
                "name" character varying NOT NULL,
                "token" character varying NOT NULL,
                "state" character varying NOT NULL DEFAULT 'closed',
                "waiter_id" uuid,
                CONSTRAINT "UQ_416c2d19db5904b65e66cf94aae" UNIQUE ("token"),
                CONSTRAINT "PK_30bc22c71f39a9d32b7f7617757" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_5376948f0c5b15f4f67d6d62d9" ON "dining_tables" ("restaurant_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "table_sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "restaurant_id" uuid NOT NULL,
                "table_id" uuid NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "closed_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_41bb063768931e959eb1f86daa3" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_73328bc5dcedce124fa829375b" ON "table_sessions" ("table_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "orders" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "restaurant_id" uuid NOT NULL,
                "table_id" uuid NOT NULL,
                "session_id" uuid NOT NULL,
                "status" character varying NOT NULL DEFAULT 'sent',
                "items" jsonb NOT NULL,
                "cancel_reason" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_85fdda5fcce2f397ef8f117a2c" ON "orders" ("restaurant_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_3d36410e89a795172fa6e0dd96" ON "orders" ("table_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "waiter_calls" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "restaurant_id" uuid NOT NULL,
                "table_id" uuid NOT NULL,
                "resolved_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_55c3174780895bccafc7e136fcc" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_72ff251c4e0bd76bc32bd297c9" ON "waiter_calls" ("restaurant_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "public"."IDX_72ff251c4e0bd76bc32bd297c9"
        `);
        await queryRunner.query(`
            DROP TABLE "waiter_calls"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_3d36410e89a795172fa6e0dd96"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_85fdda5fcce2f397ef8f117a2c"
        `);
        await queryRunner.query(`
            DROP TABLE "orders"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_73328bc5dcedce124fa829375b"
        `);
        await queryRunner.query(`
            DROP TABLE "table_sessions"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_5376948f0c5b15f4f67d6d62d9"
        `);
        await queryRunner.query(`
            DROP TABLE "dining_tables"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_81ac8c38c90887ea5f4a8d160d"
        `);
        await queryRunner.query(`
            DROP TABLE "products"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_5afdea164dc28f2c02370eedb4"
        `);
        await queryRunner.query(`
            DROP TABLE "categories"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d19273a0dd01a303a5d8fcba58"
        `);
        await queryRunner.query(`
            DROP TABLE "payments"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_66e0ea261c30ced8d28c037a3d"
        `);
        await queryRunner.query(`
            DROP TABLE "staff_users"
        `);
        await queryRunner.query(`
            DROP TABLE "restaurants"
        `);
    }

}
