import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantRepo } from '../common/tenant-repo';
import { Category, Product } from '../database/entities';
import { CategoryDto, ProductDto } from './catalog.dto';

const sameSet = (a: string[], b: string[]) => a.length === b.length && new Set(a).size === a.length && b.every((x) => a.includes(x));

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  private cats(rid: string) {
    return new TenantRepo(this.categories, rid);
  }
  private prods(rid: string) {
    return new TenantRepo(this.products, rid);
  }

  async createCategory(rid: string, dto: CategoryDto) {
    const last = (await this.cats(rid).find()).reduce((max, c) => Math.max(max, c.position + 1), 0);
    return this.cats(rid).create({ name: dto.name, position: dto.position ?? last });
  }

  async updateCategory(rid: string, id: string, dto: CategoryDto) {
    const repo = this.cats(rid);
    const cat = await repo.findOne({ id });
    if (!cat) throw new NotFoundException();
    cat.name = dto.name;
    if (dto.position !== undefined) cat.position = dto.position;
    return repo.save(cat);
  }

  async removeCategory(rid: string, id: string) {
    if ((await this.prods(rid).find({ categoryId: id })).length) {
      throw new BadRequestException('category_not_empty');
    }
    if (!(await this.cats(rid).remove({ id }))) throw new NotFoundException();
  }

  /** Cardápio completo para o painel (inclui indisponíveis). */
  async fullMenu(rid: string) {
    return this.assemble(rid, false);
  }

  /** Cardápio público: só itens disponíveis. */
  async publicMenu(rid: string) {
    return this.assemble(rid, true);
  }

  private async assemble(rid: string, onlyAvailable: boolean) {
    const [cats, prods] = await Promise.all([
      this.cats(rid).find({}, { position: 'ASC', name: 'ASC' }),
      this.prods(rid).find(onlyAvailable ? { available: true } : {}, { position: 'ASC', name: 'ASC' }),
    ]);
    return cats
      .map((c) => ({ ...c, products: prods.filter((p) => p.categoryId === c.id) }))
      .filter((c) => !onlyAvailable || c.products.length > 0);
  }

  async createProduct(rid: string, dto: ProductDto) {
    await this.assertCategory(rid, dto.categoryId);
    return this.prods(rid).create({
      categoryId: dto.categoryId,
      name: dto.name,
      description: dto.description ?? null,
      priceCents: dto.priceCents,
      imageUrl: dto.imageUrl ?? null,
      available: dto.available ?? true,
      featured: dto.featured ?? false,
      tags: dto.tags ?? [],
      position: await this.nextPosition(rid, dto.categoryId),
      options: dto.options ?? [],
    });
  }

  async updateProduct(rid: string, id: string, dto: ProductDto) {
    const repo = this.prods(rid);
    const p = await repo.findOne({ id });
    if (!p) throw new NotFoundException();
    await this.assertCategory(rid, dto.categoryId);
    Object.assign(p, {
      categoryId: dto.categoryId,
      name: dto.name,
      description: dto.description ?? null,
      priceCents: dto.priceCents,
      imageUrl: dto.imageUrl ?? null,
      available: dto.available ?? p.available,
      featured: dto.featured ?? false,
      tags: dto.tags ?? [],
      options: dto.options ?? [],
    });
    return repo.save(p);
  }

  /** Fim da lista da categoria: produto novo entra por último. */
  private async nextPosition(rid: string, categoryId: string): Promise<number> {
    const siblings = await this.prods(rid).find({ categoryId });
    return siblings.reduce((max, p) => Math.max(max, p.position + 1), 0);
  }

  /** Define a ordem das categorias. Precisa trazer todas, uma vez cada. */
  async orderCategories(rid: string, ids: string[]) {
    const repo = this.cats(rid);
    const all = await repo.find();
    if (!sameSet(ids, all.map((c) => c.id))) throw new BadRequestException('invalid_order');
    await Promise.all(all.map((c) => { c.position = ids.indexOf(c.id); return repo.save(c); }));
  }

  /** Define a ordem dos produtos de uma categoria. Precisa trazer todos, uma vez cada. */
  async orderProducts(rid: string, categoryId: string, ids: string[]) {
    await this.assertCategory(rid, categoryId);
    const repo = this.prods(rid);
    const all = await repo.find({ categoryId });
    if (!sameSet(ids, all.map((p) => p.id))) throw new BadRequestException('invalid_order');
    await Promise.all(all.map((p) => { p.position = ids.indexOf(p.id); return repo.save(p); }));
  }

  async setAvailability(rid: string, id: string, available: boolean) {
    const repo = this.prods(rid);
    const p = await repo.findOne({ id });
    if (!p) throw new NotFoundException();
    p.available = available;
    return repo.save(p);
  }

  async removeProduct(rid: string, id: string) {
    if (!(await this.prods(rid).remove({ id }))) throw new NotFoundException();
  }

  /** Produtos por id, sempre do restaurante informado. */
  productsByIds(rid: string, ids: string[]): Promise<Product[]> {
    return this.products
      .createQueryBuilder('p')
      .where('p.restaurant_id = :rid AND p.id IN (:...ids)', { rid, ids })
      .getMany();
  }

  private async assertCategory(rid: string, categoryId: string) {
    if (!(await this.cats(rid).findOne({ id: categoryId }))) {
      throw new BadRequestException('invalid_category');
    }
  }
}
