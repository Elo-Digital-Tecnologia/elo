import { Restaurant } from './restaurant.entity';
import { StaffUser } from './staff-user.entity';
import { Payment } from './payment.entity';
import { Category } from './category.entity';
import { Product } from './product.entity';
import { DiningTable } from './dining-table.entity';
import { TableSession } from './table-session.entity';
import { Order } from './order.entity';
import { WaiterCall } from './waiter-call.entity';

export * from './restaurant.entity';
export * from './staff-user.entity';
export * from './payment.entity';
export * from './category.entity';
export * from './product.entity';
export * from './dining-table.entity';
export * from './table-session.entity';
export * from './order.entity';
export * from './waiter-call.entity';

export const ENTITIES = [
  Restaurant,
  StaffUser,
  Payment,
  Category,
  Product,
  DiningTable,
  TableSession,
  Order,
  WaiterCall,
];
