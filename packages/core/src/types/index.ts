// Core Types — Elo Digital
// Shared type definitions across all packages

// ============================================
// Base Types
// ============================================

export type UUID = string & { readonly __brand: unique symbol };
export type Slug = string & { readonly __brand: unique symbol };
export type Email = string & { readonly __brand: unique symbol };
export type Phone = string & { readonly __brand: unique symbol };
export type CPF = string & { readonly __brand: unique symbol };
export type CNPJ = string & { readonly __brand: unique symbol };

export function uuid(val: string): UUID { return val as UUID; }
export function slug(val: string): Slug { return val as Slug; }
export function email(val: string): Email { return val as Email; }
export function phone(val: string): Phone { return val as Phone; }
export function cpf(val: string): CPF { return val as CPF; }
export function cnpj(val: string): CNPJ { return val as CNPJ; }

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  version: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================
// Auth Types
// ============================================

export interface JWTPayload {
  sub: string;
  email: Email;
  role: UserRole;
  restaurantId?: UUID;
  permissions: Permission[];
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

export interface SessionData {
  tableId: UUID;
  tableToken: string;
  restaurantId: UUID;
  createdAt: Date;
  expiresAt: Date;
}

export type UserRole =
  | 'superadmin'
  | 'admin_elo'
  | 'admin_restaurant'
  | 'waiter'
  | 'kitchen'
  | 'cashier';

export type Permission =
  // Restaurant management
  | 'restaurant:create'
  | 'restaurant:read'
  | 'restaurant:update'
  | 'restaurant:delete'
  | 'restaurant:manage_subscription'
  // User management
  | 'user:create'
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  | 'user:manage_roles'
  // Menu management
  | 'menu:create'
  | 'menu:read'
  | 'menu:update'
  | 'menu:delete'
  | 'menu:manage_availability'
  // Orders
  | 'order:create'
  | 'order:read'
  | 'order:update'
  | 'order:cancel'
  | 'order:manage_status'
  // Kitchen
  | 'kitchen:read'
  | 'kitchen:update_status'
  // Waiter
  | 'waiter:read_calls'
  | 'waiter:respond_calls'
  | 'waiter:validate_open'
  | 'waiter:close_table'
  // Billing
  | 'billing:read'
  | 'billing:calculate'
  | 'billing:split'
  | 'billing:apply_charges'
  | 'billing:close'
  // Reports
  | 'reports:read'
  // System
  | 'system:manage_admins'
  | 'system:view_logs';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================
// Restaurant Types
// ============================================

export interface Restaurant {
  id: UUID;
  name: string;
  slug: Slug;
  ownerName: string;
  ownerContact: Phone | Email;
  address?: string;
  phone?: Phone;
  email?: Email;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  isActive: boolean;
  subscriptionId?: UUID;
  createdAt: Date;
  updatedAt: Date;
}

export interface RestaurantSettings {
  restaurantId: UUID;
  serviceChargePercentage: number;
  serviceChargeEnabled: boolean;
  currency: 'BRL';
  timezone: string;
  language: 'pt-BR';
  orderAutoConfirm: boolean;
  maxOrderItems: number;
}

// ============================================
// User Types
// ============================================

export interface User {
  id: UUID;
  restaurantId?: UUID; // null for superadmin/admin_elo
  email: Email;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: Email;
  name: string;
  password: string;
  role: UserRole;
  restaurantId?: UUID;
}

export interface UpdateUserInput {
  name?: string;
  email?: Email;
  role?: UserRole;
  isActive?: boolean;
  avatarUrl?: string;
}

// ============================================
// Menu Types
// ============================================

export interface Category {
  id: UUID;
  restaurantId: UUID;
  name: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: UUID;
  restaurantId: UUID;
  categoryId: UUID;
  name: string;
  description?: string;
  price: number; // in cents
  imageUrl?: string;
  isAvailable: boolean;
  displayOrder: number;
  preparationTimeMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductOption {
  id: UUID;
  productId: UUID;
  name: string;
  type: 'single' | 'multiple' | 'boolean';
  required: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductOptionChoice {
  id: UUID;
  optionId: UUID;
  name: string;
  price: number; // in cents, can be 0
  isDefault: boolean;
  displayOrder: number;
}

export interface ProductImage {
  id: UUID;
  productId: UUID;
  url: string;
  alt?: string;
  displayOrder: number;
  createdAt: Date;
}

// ============================================
// Table Types
// ============================================

export interface Table {
  id: UUID;
  restaurantId: UUID;
  name: string;
  number?: string;
  capacity: number;
  status: TableStatus;
  qrCodeToken?: string;
  currentSessionId?: UUID;
  createdAt: Date;
  updatedAt: Date;
}

export type TableStatus = 'free' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';

export interface TableToken {
  id: UUID;
  tableId: UUID;
  token: string; // permanent alphanumeric token
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface TableSession {
  id: UUID;
  tableId: UUID;
  token: string; // session cookie token
  startedAt: Date;
  expiresAt: Date;
  closedAt?: Date;
  isActive: boolean;
}

// ============================================
// Order Types
// ============================================

export interface Order {
  id: UUID;
  restaurantId: UUID;
  tableId: UUID;
  sessionId: UUID;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number; // in cents
  serviceCharge: number; // in cents
  discount: number; // in cents
  total: number; // in cents
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  sentToKitchenAt?: Date;
  closedAt?: Date;
}

export type OrderStatus =
  | 'draft'           // Client building order
  | 'pending_validation' // Waiting for waiter to validate open
  | 'sent'            // Sent to kitchen
  | 'received'        // Kitchen received
  | 'preparing'       // Kitchen preparing
  | 'ready'           // Ready for pickup/delivery
  | 'delivered'       // Delivered to table
  | 'cancelled'       // Cancelled
  | 'closed';         // Table closed, bill paid

export interface OrderItem {
  id: UUID;
  orderId: UUID;
  productId: UUID;
  productName: string;
  productPrice: number; // in cents at time of order
  quantity: number;
  notes?: string;
  selectedOptions: SelectedOption[];
  totalPrice: number; // in cents
  status: OrderItemStatus;
}

export interface SelectedOption {
  optionId: UUID;
  optionName: string;
  choiceId: UUID;
  choiceName: string;
  choicePrice: number;
}

export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'cancelled';

export interface OrderStatusHistory {
  id: UUID;
  orderId: UUID;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  changedBy: UUID; // user ID or 'system' or 'client'
  reason?: string;
  createdAt: Date;
}

// ============================================
// Kitchen Types
// ============================================

export interface KitchenOrder {
  id: UUID;
  orderId: UUID;
  tableName: string;
  tableNumber?: string;
  items: KitchenOrderItem[];
  status: KitchenOrderStatus;
  priority: KitchenPriority;
  receivedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  alertCount: number;
}

export type KitchenOrderStatus = 'received' | 'preparing' | 'ready';
export type KitchenPriority = 'normal' | 'high' | 'urgent';

export interface KitchenOrderItem {
  id: UUID;
  productName: string;
  quantity: number;
  notes?: string;
  options: SelectedOption[];
  status: KitchenOrderItemStatus;
}

export type KitchenOrderItemStatus = 'pending' | 'preparing' | 'ready';

// ============================================
// Waiter Types
// ============================================

export interface CallWaiter {
  id: UUID;
  restaurantId: UUID;
  tableId: UUID;
  tableName: string;
  status: CallStatus;
  message?: string;
  createdAt: Date;
  respondedAt?: Date;
  respondedBy?: UUID;
}

export type CallStatus = 'pending' | 'responded' | 'cancelled';

// ============================================
// Billing Types
// ============================================

export interface Bill {
  id: UUID;
  restaurantId: UUID;
  tableId: UUID;
  orderId: UUID;
  items: BillItem[];
  subtotal: number;
  serviceCharge: number;
  serviceChargePercentage: number;
  discount: number;
  total: number;
  splitType: SplitType;
  splitCount: number;
  status: BillStatus;
  createdAt: Date;
  closedAt?: Date;
  paidAt?: Date;
}

export interface BillItem {
  id: UUID;
  billId: UUID;
  orderItemId: UUID;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  assignedTo?: UUID; // for by-item split
}

export type SplitType = 'none' | 'equal' | 'by-item';
export type BillStatus = 'open' | 'closed' | 'paid' | 'cancelled';

export interface ServiceCharge {
  id: UUID;
  restaurantId: UUID;
  percentage: number;
  isEnabled: boolean;
  description: string;
}

// ============================================
// Subscription Types
// ============================================

export interface Subscription {
  id: UUID;
  restaurantId: UUID;
  planId: UUID;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'grace_period'
  | 'suspended'
  | 'cancelled'
  | 'expired';

export interface Payment {
  id: UUID;
  subscriptionId: UUID;
  amount: number; // in cents
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  notes?: string;
  recordedBy: UUID;
  recordedAt: Date;
  confirmedAt?: Date;
}

export type PaymentMethod = 'cash' | 'pix' | 'bank_transfer' | 'card' | 'other';
export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'refunded';

// ============================================
// WebSocket Types
// ============================================

export interface WSEvent<T = unknown> {
  event: string;
  payload: T;
  timestamp: string;
}

export interface WSOrderEvent extends WSEvent<OrderEventPayload> {
  event: 'order.created' | 'order.updated' | 'order.status_changed' | 'order.cancelled';
}

export interface OrderEventPayload {
  orderId: UUID;
  tableId: UUID;
  tableName: string;
  status: OrderStatus;
  items?: OrderItem[];
}

export interface WSKitchenEvent extends WSEvent<KitchenEventPayload> {
  event: 'kitchen.order_received' | 'kitchen.status_changed' | 'kitchen.alert';
}

export interface KitchenEventPayload {
  orderId: UUID;
  tableName: string;
  tableNumber?: string;
  items: KitchenOrderItem[];
}

export interface WSWaiterEvent extends WSEvent<WaiterEventPayload> {
  event: 'waiter.call_created' | 'waiter.call_responded' | 'waiter.validation_requested';
}

export interface WaiterEventPayload {
  callId: UUID;
  tableId: UUID;
  tableName: string;
  message?: string;
}

export interface WSBillEvent extends WSEvent<BillEventPayload> {
  event: 'bill.updated' | 'bill.closed' | 'bill.split_changed';
}

export interface BillEventPayload {
  billId: UUID;
  tableId: UUID;
  total: number;
  splitType: SplitType;
  splitCount: number;
}

// ============================================
// Utility Types
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type EntityId<T extends string> = string & { readonly __entity: T };

// Branded IDs for type safety
export type RestaurantId = EntityId<'Restaurant'>;
export type UserId = EntityId<'User'>;
export type CategoryId = EntityId<'Category'>;
export type ProductId = EntityId<'Product'>;
export type TableId = EntityId<'Table'>;
export type OrderId = EntityId<'Order'>;
export type BillId = EntityId<'Bill'>;
export type SubscriptionId = EntityId<'Subscription'>;
export type PaymentId = EntityId<'Payment'>;