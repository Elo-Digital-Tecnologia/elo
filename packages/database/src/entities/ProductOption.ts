import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { Product } from './Product';
import { ProductOptionChoice } from './ProductOptionChoice';

export enum ProductOptionType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  BOOLEAN = 'boolean'
}

@Entity('product_options')
@Index(['productId', 'displayOrder'])
export class ProductOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'enum', enum: ProductOptionType })
  type: ProductOptionType;

  @Column({ default: false })
  required: boolean;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Product, product => product.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(() => ProductOptionChoice, choice => choice.option)
  choices: ProductOptionChoice[];
}