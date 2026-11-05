import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PizzaCategories1793898994931 implements MigrationInterface {
    name = 'PizzaCategories1793898994931';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "products" ADD "size_prices" jsonb NOT NULL DEFAULT '{}'`
        );
        await queryRunner.query(
            `ALTER TABLE "categories" ADD "kind" character varying(16) NOT NULL DEFAULT 'standard'`
        );
        await queryRunner.query(`ALTER TABLE "categories" ADD "pizza" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "pizza"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "kind"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "size_prices"`);
    }
}
