import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from './User';
import { Category } from './Category';
import { Product } from './Product';
import { Table } from './Table';
import { Order } from './Order';
import { Subscription } from './Subscription';

@Entity('restaurants')
@Index(['slug'], { unique: true })
@Index(['isActive'])
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 64, unique: true })
  slug: string;

  @Column({ length: 100, name: 'owner_name' })
  ownerName: string;

  @Column({ length: 100, name: 'owner_contact' })
  ownerContact: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', name: 'logo_url', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', name: 'primary_color', length: 7, nullable: true })
  primaryColor: string | null;

  @Column({ type: 'varchar', name: 'secondary_color', length: 7, nullable: true })
  secondaryColor: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => User, user => user.restaurant)
  users: User[];

  @OneToMany(() => Category, category => category.restaurant)
  categories: Category[];

  @OneToMany(() => Product, product => product.restaurant)
  products: Product[];

  @OneToMany(() => Table, table => table.restaurant)
  tables: Table[];

  @OneToMany(() => Order, order => order.restaurant)
  orders: Order[];

  @OneToOne(() => Subscription, subscription => subscription.restaurant)
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription | null;
}