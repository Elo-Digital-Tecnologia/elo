import { Repository } from 'typeorm';
import { TenantRepo } from './tenant-repo';

interface Thing {
  id: string;
  restaurantId: string;
}

function fakeRepo(rows: Thing[]) {
  return {
    find: async ({ where }: { where: Partial<Thing> }) =>
      rows.filter((r) => Object.entries(where).every(([k, v]) => r[k as keyof Thing] === v)),
    findOne: async ({ where }: { where: Partial<Thing> }) =>
      rows.find((r) => Object.entries(where).every(([k, v]) => r[k as keyof Thing] === v)) ?? null,
    create: (d: Thing) => d,
    save: async (d: Thing) => d,
    delete: async ({ restaurantId, id }: Thing) => ({
      affected: rows.filter((r) => r.restaurantId === restaurantId && r.id === id).length,
    }),
  } as unknown as Repository<Thing>;
}

describe('TenantRepo', () => {
  const rows = [
    { id: '1', restaurantId: 'A' },
    { id: '2', restaurantId: 'B' },
  ];

  it('never returns another restaurant rows', async () => {
    const a = new TenantRepo(fakeRepo(rows), 'A');
    expect(await a.find()).toEqual([rows[0]]);
    expect(await a.findOne({ id: '2' })).toBeNull();
  });

  it('forces own restaurantId on create, ignoring input', async () => {
    const a = new TenantRepo(fakeRepo(rows), 'A');
    const created = await a.create({ id: '3', restaurantId: 'B' });
    expect(created.restaurantId).toBe('A');
  });

  it('refuses to save foreign entity and cannot delete foreign row', async () => {
    const a = new TenantRepo(fakeRepo(rows), 'A');
    expect(() => a.save(rows[1])).toThrow('tenant mismatch');
    expect(await a.remove({ id: '2' })).toBe(false);
  });
});
