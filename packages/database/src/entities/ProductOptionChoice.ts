import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { ProductOption } from './ProductOption';

@Entity('product_option_choices')
@Index(['optionId', 'displayOrder'])
export class ProductOptionChoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'option_id' })
  optionId: string;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'int', default: 0 })
  price: number; // in cents

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ProductOption, option => option.choices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'option_id' })
  option: ProductOption;
}