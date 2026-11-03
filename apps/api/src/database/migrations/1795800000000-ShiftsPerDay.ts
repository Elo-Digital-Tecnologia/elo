import { MigrationInterface, QueryRunner } from 'typeorm';

/** Opening hours hold a list of shifts per day: `{ open, close }` becomes `[{ open, close }]` and a closed day (`null`) becomes `[]`. */
export class ShiftsPerDay1795800000000 implements MigrationInterface {
    name = 'ShiftsPerDay1795800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      UPDATE "restaurants" SET "opening_hours" = (
        SELECT jsonb_agg(CASE WHEN jsonb_typeof(d.value) = 'object' THEN jsonb_build_array(d.value) ELSE '[]'::jsonb END ORDER BY d.ord)
        FROM jsonb_array_elements("opening_hours") WITH ORDINALITY AS d(value, ord)
      )
      WHERE "opening_hours" IS NOT NULL AND jsonb_typeof("opening_hours") = 'array'
        AND EXISTS (SELECT 1 FROM jsonb_array_elements("opening_hours") e WHERE jsonb_typeof(e) <> 'array')
    `);
    }

    /** Only the first shift of each day survives the way back. */
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      UPDATE "restaurants" SET "opening_hours" = (
        SELECT jsonb_agg(CASE WHEN jsonb_array_length(d.value) > 0 THEN d.value -> 0 ELSE 'null'::jsonb END ORDER BY d.ord)
        FROM jsonb_array_elements("opening_hours") WITH ORDINALITY AS d(value, ord)
      )
      WHERE "opening_hours" IS NOT NULL AND jsonb_typeof("opening_hours") = 'array'
        AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements("opening_hours") e WHERE jsonb_typeof(e) <> 'array')
    `);
    }
}
