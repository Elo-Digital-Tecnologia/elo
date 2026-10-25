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
import { Restaurant } from './Restaurant';
import { Category } from './Category';
import { ProductOption } from './ProductOption';
import { ProductImage } from './ProductImage';

@Entity('products')
@Index(['restaurantId', 'categoryId', 'displayOrder'])
@Index(['restaurantId', 'isAvailable'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @Column({ name: 'category_id' })
  categoryId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int' })
  price: number; // in cents

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ name: 'preparation_time_minutes', type: 'int', nullable: true })
  preparationTimeMinutes: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Restaurant, restaurant => restaurant.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @ManyToOne(() => Category, category => category.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => ProductOption, option => option.product)
  options: ProductOption[];

  @OneToMany(() => ProductImage, image => image.product)
  images: ProductImage[];
}