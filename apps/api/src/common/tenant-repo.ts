import { DeepPartial, FindOptionsWhere, Repository, SelectQueryBuilder } from 'typeorm';

/**
 * Repositório com escopo de restaurante. Todo acesso a dados de restaurante passa
 * por aqui: o filtro `restaurantId` é imposto no servidor, nunca vem do cliente.
 */
export class TenantRepo<T extends { restaurantId: string }> {
  constructor(
    private readonly repo: Repository<T>,
    readonly restaurantId: string,
  ) {}

  private where(extra: FindOptionsWhere<T> = {}): FindOptionsWhere<T> {
    return { ...extra, restaurantId: this.restaurantId } as FindOptionsWhere<T>;
  }

  /** Query builder já filtrado pelo restaurante; filtros extras entram com `andWhere`. */
  qb(alias: string): SelectQueryBuilder<T> {
    return this.repo
      .createQueryBuilder(alias)
      .where(`${alias}.restaurantId = :__tenantId`, { __tenantId: this.restaurantId });
  }

  find(where: FindOptionsWhere<T> = {}, order?: Record<string, 'ASC' | 'DESC'>): Promise<T[]> {
    return this.repo.find({ where: this.where(where), order: order as never });
  }

  findOne(where: FindOptionsWhere<T>): Promise<T | null> {
    return this.repo.findOne({ where: this.where(where) });
  }

  create(data: DeepPartial<T>): Promise<T> {
    return this.repo.save(this.repo.create({ ...data, restaurantId: this.restaurantId }));
  }

  /** Salva entidade já carregada; recusa se pertencer a outro restaurante. */
  save(entity: T): Promise<T> {
    if (entity.restaurantId !== this.restaurantId) throw new Error('tenant mismatch');
    return this.repo.save(entity);
  }

  async remove(where: FindOptionsWhere<T>): Promise<boolean> {
    const res = await this.repo.delete(this.where(where));
    return (res.affected ?? 0) > 0;
  }
}
