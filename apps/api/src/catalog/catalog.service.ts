import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantRepo } from '../common/tenant-repo';
import { Category, Product } from '../database/entities';
import { CategoryDto, ProductDto } from './catalog.dto';

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

  createCategory(rid: string, dto: CategoryDto) {
    return this.cats(rid).create({ name: dto.name, position: dto.position ?? 0 });
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
      this.prods(rid).find(onlyAvailable ? { available: true } : {}, { name: 'ASC' }),
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
      options: dto.options ?? [],
    });
    return repo.save(p);
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
