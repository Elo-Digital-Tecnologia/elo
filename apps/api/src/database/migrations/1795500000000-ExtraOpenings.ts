import { MigrationInterface, QueryRunner } from 'typeorm';

/** Windows over the opening hours can also open the restaurant outside them, not only close it. */
export class ExtraOpenings1795500000000 implements MigrationInterface {
    name = 'ExtraOpenings1795500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "restaurant_pauses" ADD "kind" character varying(20) NOT NULL DEFAULT 'closure'`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "restaurant_pauses" WHERE "kind" = 'opening'`
        );
        await queryRunner.query(`ALTER TABLE "restaurant_pauses" DROP COLUMN "kind"`);
    }
}
