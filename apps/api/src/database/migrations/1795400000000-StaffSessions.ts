import { MigrationInterface, QueryRunner } from 'typeorm';

/** Staff sessions that outlive a tab and a closed browser, ended by inactivity, sign-out or a new password. */
export class StaffSessions1795400000000 implements MigrationInterface {
    name = 'StaffSessions1795400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      CREATE TABLE "staff_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "scope" character varying(90) NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "credential_tag" character varying(32) NOT NULL,
        "user_agent" character varying(200),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "last_used_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_staff_sessions_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "PK_staff_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_staff_sessions_user" FOREIGN KEY ("user_id") REFERENCES "staff_users"("id") ON DELETE CASCADE
      )
    `);
        await queryRunner.query(
            `CREATE INDEX "IDX_staff_sessions_user_id" ON "staff_sessions" ("user_id")`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_staff_sessions_expires_at" ON "staff_sessions" ("expires_at")`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "staff_sessions"`);
    }
}
