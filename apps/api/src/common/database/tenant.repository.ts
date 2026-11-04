import type {
    DeepPartial,
    FindOptionsWhere,
    Repository,
    SelectQueryBuilder
} from 'typeorm';
import { InvariantViolationException } from '#/common/exceptions/invariant-violation.exception.js';

/**
 * Repository scoped to one restaurant. Every access to restaurant data goes through
 * here: the `restaurantId` filter is set on the server and never comes from the client.
 */
export class TenantRepository<T extends { restaurantId: string }> {
    constructor(
        private readonly repo: Repository<T>,
        readonly restaurantId: string
    ) {}

    private where(extra: FindOptionsWhere<T> = {}): FindOptionsWhere<T> {
        return { ...extra, restaurantId: this.restaurantId } as FindOptionsWhere<T>;
    }

    /** Query builder already filtered by the restaurant; extra filters go in with `andWhere`. */
    public qb(alias: string): SelectQueryBuilder<T> {
        return this.repo
            .createQueryBuilder(alias)
            .where(`${alias}.restaurantId = :__tenantId`, {
                __tenantId: this.restaurantId
            });
    }

    public find(
        where: FindOptionsWhere<T> = {},
        order?: Record<string, 'ASC' | 'DESC'>
    ): Promise<T[]> {
        return this.repo.find({ where: this.where(where), order: order as never });
    }

    public findOne(where: FindOptionsWhere<T>): Promise<T | null> {
        return this.repo.findOne({ where: this.where(where) });
    }

    public create(data: DeepPartial<T>): Promise<T> {
        return this.repo.save(
            this.repo.create({ ...data, restaurantId: this.restaurantId })
        );
    }

    /** Saves an entity already loaded; refuses it when it belongs to another restaurant. */
    public save(entity: T): Promise<T> {
        if (entity.restaurantId !== this.restaurantId)
            throw new InvariantViolationException('tenant mismatch');
        return this.repo.save(entity);
    }

    public async remove(where: FindOptionsWhere<T>): Promise<boolean> {
        const res = await this.repo.delete(this.where(where));
        return (res.affected ?? 0) > 0;
    }
}
