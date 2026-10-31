import { MigrationInterface, QueryRunner } from 'typeorm';

/** Column sizes that match the field rules in `@elo/core`, so the database refuses what the API refuses. */
const LIMITS: [table: string, column: string, length: number][] = [
  ['restaurants', 'slug', 60],
  ['restaurants', 'name', 120],
  ['restaurants', 'manager_name', 80],
  ['restaurants', 'manager_contact', 120],
  ['restaurants', 'wifi_name', 32],
  ['restaurants', 'wifi_password', 63],
  ['categories', 'name', 80],
  ['products', 'name', 120],
  ['dining_tables', 'name', 40],
];

export class FieldLimits1795000000000 implements MigrationInterface {
  name = 'FieldLimits1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Stop before changing anything if some value would not fit, and say which.
    const tooLong: string[] = [];
    for (const [table, column, length] of LIMITS) {
      const [{ n }] = await queryRunner.query(`SELECT COUNT(*)::int AS n FROM "${table}" WHERE length("${column}") > ${length}`);
      if (n > 0) tooLong.push(`${table}.${column}: ${n} value(s) longer than ${length}`);
    }
    if (tooLong.length) throw new Error(`Shorten these values before running FieldLimits:\n${tooLong.join('\n')}`);
    for (const [table, column, length] of LIMITS) {
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE character varying(${length})`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of LIMITS) {
      const type = table === 'restaurants' && column.startsWith('wifi') ? 'character varying(80)' : 'character varying';
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE ${type}`);
    }
  }
}
