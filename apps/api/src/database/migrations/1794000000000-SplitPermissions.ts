import { MigrationInterface, QueryRunner } from 'typeorm';

const UP: Record<string, string[]> = {
  restaurants: ['restaurants.view', 'restaurants.create', 'restaurants.edit'],
  subscriptions: ['restaurants.view', 'payments.view', 'payments.record'],
  access_control: ['restaurants.view', 'restaurants.suspend'],
  restaurant_access: ['restaurants.view', 'restaurants.access'],
  table_tokens: ['restaurants.view', 'restaurants.tables'],
  settings: ['team.manage'],
};

/** Coarse Elo team permissions become fine-grained ones; deletion is never granted by the conversion. */
export class SplitPermissions1794000000000 implements MigrationInterface {
  name = 'SplitPermissions1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.remap(queryRunner, UP);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const down: Record<string, string[]> = {
      'restaurants.view': ['restaurants'],
      'restaurants.create': ['restaurants'],
      'restaurants.edit': ['restaurants'],
      'payments.view': ['subscriptions'],
      'payments.record': ['subscriptions'],
      'restaurants.suspend': ['access_control'],
      'restaurants.delete': ['access_control'],
      'restaurants.access': ['restaurant_access'],
      'restaurants.tables': ['table_tokens'],
      'restaurants.activity': [],
      'team.manage': ['settings'],
    };
    await this.remap(queryRunner, down);
  }

  private async remap(queryRunner: QueryRunner, map: Record<string, string[]>) {
    const rows: { id: string; permissions: string[] }[] = await queryRunner.query(
      `SELECT "id", "permissions" FROM "staff_users" WHERE "restaurant_id" IS NULL`,
    );
    for (const row of rows) {
      const next = [...new Set(row.permissions.flatMap((p) => map[p] ?? [p]))];
      await queryRunner.query(`UPDATE "staff_users" SET "permissions" = $1 WHERE "id" = $2`, [next, row.id]);
    }
  }
}
