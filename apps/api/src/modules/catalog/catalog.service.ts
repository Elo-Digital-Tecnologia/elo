import type { SetupProblem } from '@elo/core/catalog/product-pricing';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CategoryKind } from '@elo/core/catalog/category-kinds';
import {
    flavorPriceProblems,
    knownSizePrices,
    normalizePizzaSetup,
    pizzaSetupProblems
} from '@elo/core/catalog/pizza-pricing';
import {
    normalizeOptions,
    optionsProblems,
    pricedBySize
} from '@elo/core/catalog/product-pricing';
import { Repository } from 'typeorm';
import { TenantRepository } from '#/common/database/tenant.repository.js';
import { ValidationFailedException } from '#/common/exceptions/validation-failed.exception.js';
import { CategoryDTO } from './dto/category.dto.js';
import { ProductDTO } from './dto/product.dto.js';
import { CategoryEntity } from './entities/category.entity.js';
import { ProductEntity } from './entities/product.entity.js';
import { CategoryNotEmptyException } from './exceptions/category-not-empty.exception.js';
import { CategoryNotFoundException } from './exceptions/category-not-found.exception.js';
import { InvalidCategoryException } from './exceptions/invalid-category.exception.js';
import { InvalidOrderException } from './exceptions/invalid-order.exception.js';
import { ProductNotFoundException } from './exceptions/product-not-found.exception.js';

const refuse = (problems: SetupProblem[]) => {
    if (problems.length)
        throw new ValidationFailedException(
            problems.map((p) => ({ field: p.path, ...p.error }))
        );
};

const sameSet = (a: string[], b: string[]) =>
    a.length === b.length &&
    new Set(a).size === a.length &&
    b.every((x) => a.includes(x));

@Injectable()
export class CatalogService {
    constructor(
        @InjectRepository(CategoryEntity)
        private readonly categories: Repository<CategoryEntity>,
        @InjectRepository(ProductEntity)
        private readonly products: Repository<ProductEntity>
    ) {}

    private cats(rid: string) {
        return new TenantRepository(this.categories, rid);
    }
    private prods(rid: string) {
        return new TenantRepository(this.products, rid);
    }

    public async createCategory(rid: string, dto: CategoryDTO) {
        const last = (await this.cats(rid).find()).reduce(
            (max, c) => Math.max(max, c.position + 1),
            0
        );
        const kind = dto.kind ?? CategoryKind.STANDARD;
        return this.cats(rid).create({
            name: dto.name,
            position: dto.position ?? last,
            kind,
            pizza: this.pizzaSetup(kind, dto)
        });
    }

    /** A pizza category needs its setup; any other has none. */
    private pizzaSetup(kind: CategoryKind, dto: CategoryDTO) {
        if (kind !== CategoryKind.PIZZA) {
            refuse(
                dto.pizza ? [{ path: 'pizza', error: { code: 'unknown_field' } }] : []
            );
            return null;
        }
        if (!dto.pizza)
            throw new ValidationFailedException([{ field: 'pizza', code: 'required' }]);
        refuse(pizzaSetupProblems(dto.pizza));
        return normalizePizzaSetup(dto.pizza);
    }

    public async updateCategory(rid: string, id: string, dto: CategoryDTO) {
        const repo = this.cats(rid);
        const cat = await repo.findOne({ id });
        if (!cat) throw new CategoryNotFoundException();
        cat.name = dto.name;
        if (dto.position !== undefined) cat.position = dto.position;
        cat.pizza = this.pizzaSetup(cat.kind, dto);
        return repo.save(cat);
    }

    public async removeCategory(rid: string, id: string) {
        if ((await this.prods(rid).find({ categoryId: id })).length) {
            throw new CategoryNotEmptyException();
        }
        if (!(await this.cats(rid).remove({ id }))) throw new CategoryNotFoundException();
    }

    /** Full menu for the panel (unavailable items included). */
    public async fullMenu(rid: string) {
        return this.assemble(rid, false);
    }

    /** Public menu: available items only. */
    public async publicMenu(rid: string) {
        return this.assemble(rid, true);
    }

    private async assemble(rid: string, onlyAvailable: boolean) {
        const [cats, prods] = await Promise.all([
            this.cats(rid).find({}, { position: 'ASC', name: 'ASC' }),
            this.prods(rid).find(onlyAvailable ? { available: true } : {}, {
                position: 'ASC',
                name: 'ASC'
            })
        ]);
        return cats
            .map((c) => ({ ...c, products: prods.filter((p) => p.categoryId === c.id) }))
            .filter((c) => !onlyAvailable || c.products.length > 0);
    }

    public async createProduct(rid: string, dto: ProductDTO) {
        const pricing = this.pricing(await this.categoryOf(rid, dto.categoryId), dto);
        return this.prods(rid).create({
            categoryId: dto.categoryId,
            name: dto.name,
            description: dto.description ?? null,
            priceCents: pricing.priceCents,
            imageUrl: dto.imageUrl ?? null,
            available: dto.available ?? true,
            featured: dto.featured ?? false,
            tags: dto.tags ?? [],
            position: await this.nextPosition(rid, dto.categoryId),
            options: pricing.options,
            sizePrices: pricing.sizePrices
        });
    }

    public async updateProduct(rid: string, id: string, dto: ProductDTO) {
        const repo = this.prods(rid);
        const p = await repo.findOne({ id });
        if (!p) throw new ProductNotFoundException();
        const pricing = this.pricing(await this.categoryOf(rid, dto.categoryId), dto);
        Object.assign(p, {
            categoryId: dto.categoryId,
            name: dto.name,
            description: dto.description ?? null,
            priceCents: pricing.priceCents,
            imageUrl: dto.imageUrl ?? null,
            available: dto.available ?? p.available,
            featured: dto.featured ?? false,
            tags: dto.tags ?? [],
            options: pricing.options,
            sizePrices: pricing.sizePrices
        });
        return repo.save(p);
    }

    /**
     * Price and options as stored, checked against the category. A pizza flavor has
     * prices per size and no options of its own; a product priced by its size keeps
     * no price of its own; any other needs one.
     */
    private pricing(category: CategoryEntity, dto: ProductDTO) {
        if (category.kind === CategoryKind.PIZZA && category.pizza) {
            const sizePrices = dto.sizePrices ?? {};
            refuse([
                ...flavorPriceProblems(category.pizza, sizePrices),
                ...(dto.options?.length
                    ? [{ path: 'options', error: { code: 'unknown_field' as const } }]
                    : [])
            ]);
            return {
                priceCents: 0,
                options: [],
                sizePrices: knownSizePrices(category.pizza, sizePrices)
            };
        }
        const groups = dto.options ?? [];
        const problems = optionsProblems(groups);
        const bySize = pricedBySize(groups);
        if (!bySize && dto.priceCents === undefined)
            problems.push({ path: 'priceCents', error: { code: 'required' } });
        refuse(problems);
        return {
            priceCents: bySize ? 0 : (dto.priceCents ?? 0),
            options: normalizeOptions(groups),
            sizePrices: {}
        };
    }

    /** End of the category list: a new product goes last. */
    private async nextPosition(rid: string, categoryId: string): Promise<number> {
        const siblings = await this.prods(rid).find({ categoryId });
        return siblings.reduce((max, p) => Math.max(max, p.position + 1), 0);
    }

    /** Sets the order of the categories. It must list all of them, once each. */
    public async orderCategories(rid: string, ids: string[]) {
        const repo = this.cats(rid);
        const all = await repo.find();
        if (
            !sameSet(
                ids,
                all.map((c) => c.id)
            )
        )
            throw new InvalidOrderException();
        await Promise.all(
            all.map((c) => {
                c.position = ids.indexOf(c.id);
                return repo.save(c);
            })
        );
    }

    /** Sets the order of a category's products. It must list all of them, once each. */
    public async orderProducts(rid: string, categoryId: string, ids: string[]) {
        await this.assertCategory(rid, categoryId);
        const repo = this.prods(rid);
        const all = await repo.find({ categoryId });
        if (
            !sameSet(
                ids,
                all.map((p) => p.id)
            )
        )
            throw new InvalidOrderException();
        await Promise.all(
            all.map((p) => {
                p.position = ids.indexOf(p.id);
                return repo.save(p);
            })
        );
    }

    public async setAvailability(rid: string, id: string, available: boolean) {
        const repo = this.prods(rid);
        const p = await repo.findOne({ id });
        if (!p) throw new ProductNotFoundException();
        p.available = available;
        return repo.save(p);
    }

    public async removeProduct(rid: string, id: string) {
        if (!(await this.prods(rid).remove({ id }))) throw new ProductNotFoundException();
    }

    /** Products by id, always from the given restaurant. */
    public productsByIds(rid: string, ids: string[]): Promise<ProductEntity[]> {
        return this.products
            .createQueryBuilder('p')
            .where('p.restaurant_id = :rid AND p.id IN (:...ids)', { rid, ids })
            .getMany();
    }

    private async assertCategory(rid: string, categoryId: string) {
        await this.categoryOf(rid, categoryId);
    }

    private async categoryOf(rid: string, categoryId: string): Promise<CategoryEntity> {
        const category = await this.cats(rid).findOne({ id: categoryId });
        if (!category) throw new InvalidCategoryException();
        return category;
    }

    /** Categories by id, always from the given restaurant. */
    public categoriesByIds(rid: string, ids: string[]): Promise<CategoryEntity[]> {
        return this.categories
            .createQueryBuilder('c')
            .where('c.restaurant_id = :rid AND c.id IN (:...ids)', { rid, ids })
            .getMany();
    }

    /** All products of one category of the restaurant. */
    public productsOfCategory(rid: string, categoryId: string): Promise<ProductEntity[]> {
        return this.prods(rid).find({ categoryId });
    }
}
