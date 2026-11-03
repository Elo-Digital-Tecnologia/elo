import { MigrationInterface, QueryRunner } from 'typeorm';

/** Where guests are invited to review a restaurant on Google. */
export class GoogleReviewUrl1795900000000 implements MigrationInterface {
    name = 'GoogleReviewUrl1795900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "restaurants" ADD "google_review_url" character varying(500)`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "restaurants" DROP COLUMN "google_review_url"`
        );
    }
}
