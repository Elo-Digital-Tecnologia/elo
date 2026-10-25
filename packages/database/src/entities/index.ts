// Entities barrel export
import { Restaurant } from './Restaurant';
import { User, UserRole } from './User';
import { Category } from './Category';
import { Product } from './Product';
import { ProductOption, ProductOptionType } from './ProductOption';
import { ProductOptionChoice } from './ProductOptionChoice';
import { ProductImage } from './ProductImage';
import { Table, TableStatus } from './Table';
import { TableToken } from './TableToken';
import { TableSession } from './TableSession';
import { Order, OrderStatus } from './Order';
import { OrderItem, OrderItemStatus } from './OrderItem';
import type { SelectedOption } from './OrderItem';
import { OrderStatusHistory } from './OrderStatusHistory';
import { CallWaiter, CallStatus } from './CallWaiter';
import { Bill, BillStatus, SplitType } from './Bill';
import { BillItem } from './BillItem';
import { ServiceCharge } from './ServiceCharge';
import { Subscription, SubscriptionStatus } from './Subscription';
import { Payment, PaymentMethod, PaymentStatus } from './Payment';

export { Restaurant };
export { User, UserRole };
export { Category };
export { Product };
export { ProductOption, ProductOptionType };
export { ProductOptionChoice };
export { ProductImage };
export { Table, TableStatus };
export { TableToken };
export { TableSession };
export { Order, OrderStatus };
export { OrderItem, OrderItemStatus };
export type { SelectedOption };
export { OrderStatusHistory };
export { CallWaiter, CallStatus };
export { Bill, BillStatus, SplitType };
export { BillItem };
export { ServiceCharge };
export { Subscription, SubscriptionStatus };
export { Payment, PaymentMethod, PaymentStatus };

// Entity array for TypeORM
export const entities = [
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
