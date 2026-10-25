// Menu Service — Elo Digital API

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Category, Product, ProductOption, ProductOptionChoice, ProductImage } from '@elo-digital/database/entities';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductOption)
    private readonly optionRepository: Repository<ProductOption>,
    @InjectRepository(ProductOptionChoice)
    private readonly choiceRepository: Repository<ProductOptionChoice>,
    @InjectRepository(ProductImage)
    private readonly imageRepository: Repository<ProductImage>
  ) {}

  // Categories
  async createCategory(restaurantId: string, input: any) {
    const category = this.categoryRepository.create({ ...input, restaurantId });
    return this.categoryRepository.save(category);
  }

  async getCategories(restaurantId: string) {
    return this.categoryRepository.find({
      where: { restaurantId, isActive: true },
      order: { displayOrder: 'ASC' }
    });
  }

  async getCategory(restaurantId: string, id: string) {
    const category = await this.categoryRepository.findOne({
      where: { id, restaurantId }
    });
    if (!category) throw new Error('Categoria não encontrada');
    return category;
  }

  async updateCategory(restaurantId: string, id: string, input: any) {
    const category = await this.getCategory(restaurantId, id);
    Object.assign(category, input);
    return this.categoryRepository.save(category);
  }

  async deleteCategory(restaurantId: string, id: string) {
    const category = await this.getCategory(restaurantId, id);
    await this.categoryRepository.remove(category);
    return { success: true };
  }

  // Products
  async createProduct(restaurantId: string, input: any) {
    const product = this.productRepository.create({ ...input, restaurantId });
    return this.productRepository.save(product);
  }

  async getProducts(restaurantId: string, categoryId?: string) {
    const query = this.productRepository.createQueryBuilder('product')
      .where('product.restaurantId = :restaurantId', { restaurantId })
      .andWhere('product.isAvailable = :isAvailable', { isAvailable: true })
      .orderBy('product.displayOrder', 'ASC');

    if (categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    return query.getMany();
  }

  async getProduct(restaurantId: string, id: string) {
    const product = await this.productRepository.findOne({
      where: { id, restaurantId },
      relations: ['options', 'options.choices', 'images']
    });
    if (!product) throw new Error('Produto não encontrado');
    return product;
  }

  async updateProduct(restaurantId: string, id: string, input: any) {
    const product = await this.getProduct(restaurantId, id);
    Object.assign(product, input);
    return this.productRepository.save(product);
  }

  async toggleAvailability(restaurantId: string, id: string, available: boolean) {
    const product = await this.getProduct(restaurantId, id);
    product.isAvailable = available;
    return this.productRepository.save(product);
  }

  async deleteProduct(restaurantId: string, id: string) {
    const product = await this.getProduct(restaurantId, id);
    await this.productRepository.remove(product);
    return { success: true };
  }

  // Product Options
  async createOption(productId: string, input: any) {
    const option = this.optionRepository.create({ ...input, productId });
    return this.optionRepository.save(option);
  }

  async getOptions(productId: string) {
    return this.optionRepository.find({
      where: { productId },
      relations: ['choices'],
      order: { displayOrder: 'ASC' }
    });
  }

  async updateOption(optionId: string, input: any) {
    const option = await this.optionRepository.findOne({ where: { id: optionId } });
    if (!option) throw new Error('Opção não encontrada');
    Object.assign(option, input);
    return this.optionRepository.save(option);
  }

  async deleteOption(optionId: string) {
    const option = await this.optionRepository.findOne({ where: { id: optionId } });
    if (!option) throw new Error('Opção não encontrada');
    await this.optionRepository.remove(option);
    return { success: true };
  }

  // Option Choices
  async createChoice(optionId: string, input: any) {
    const choice = this.choiceRepository.create({ ...input, optionId });
    return this.choiceRepository.save(choice);
  }

  async updateChoice(choiceId: string, input: any) {
    const choice = await this.choiceRepository.findOne({ where: { id: choiceId } });
    if (!choice) throw new Error('Escolha não encontrada');
    Object.assign(choice, input);
    return this.choiceRepository.save(choice);
  }

  async deleteChoice(choiceId: string) {
    const choice = await this.choiceRepository.findOne({ where: { id: choiceId } });
    if (!choice) throw new Error('Escolha não encontrada');
    await this.choiceRepository.remove(choice);
    return { success: true };
  }
}