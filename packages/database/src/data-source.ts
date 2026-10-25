// TypeORM Data Source Configuration
// Elo Digital Database

import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';

// Import all entities directly
import { Restaurant } from './entities/Restaurant';
import { User } from './entities/User';
import { Category } from './entities/Category';
import { Product } from './entities/Product';
import { ProductOption } from './entities/ProductOption';
import { ProductOptionChoice } from './entities/ProductOptionChoice';
import { ProductImage } from './entities/ProductImage';
import { Table } from './entities/Table';
import { TableToken } from './entities/TableToken';
import { TableSession } from './entities/TableSession';
import { Order } from './entities/Order';
import { OrderItem } from './entities/OrderItem';
import { OrderStatusHistory } from './entities/OrderStatusHistory';
import { CallWaiter } from './entities/CallWaiter';
import { Bill } from './entities/Bill';
import { BillItem } from './entities/BillItem';
import { ServiceCharge } from './entities/ServiceCharge';
import { Subscription } from './entities/Subscription';
import { Payment } from './entities/Payment';

const entities = [
  Restaurant,
  User,
  Category,
  Product,
  ProductOption,
  ProductOptionChoice,
  ProductImage,
  Table,
  TableToken,
  TableSession,
  Order,
  OrderItem,
  OrderStatusHistory,
  CallWaiter,
  Bill,
  BillItem,
  ServiceCharge,
  Subscription,
  Payment
];

// Environment variables with defaults
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'elo_digital',
  password: process.env.DB_PASSWORD || 'elo_digital',
  database: process.env.DB_NAME || 'elo_digital',
  synchronize: process.env.NODE_ENV === 'development' && process.env.DB_SYNC === 'true',
  logging: process.env.NODE_ENV === 'development' && process.env.DB_LOG === 'true',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  migrationsTableName: 'migrations',
  migrations: ['src/migrations/*.ts'],
  entities
};

export const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;