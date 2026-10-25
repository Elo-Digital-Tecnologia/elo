// WebSocket Events — Elo Digital API
// Event types for real-time communication

// ============================================
// Event Names
// ============================================

export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Authentication
  AUTH: 'auth',
  AUTH_SUCCESS: 'auth:success',
  AUTH_ERROR: 'auth:error',

  // Orders
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_STATUS_CHANGED: 'order:status_changed',
  ORDER_CANCELLED: 'order:cancelled',

  // Kitchen
  KITCHEN_ORDER_RECEIVED: 'kitchen:order_received',
  KITCHEN_STATUS_CHANGED: 'kitchen:status_changed',
  KITCHEN_ALERT: 'kitchen:alert',

  // Waiter
  WAITER_CALL_CREATED: 'waiter:call_created',
  WAITER_CALL_RESPONDED: 'waiter:call_responded',
  WAITER_VALIDATION_REQUESTED: 'waiter:validation_requested',

  // Billing
  BILL_UPDATED: 'bill:updated',
  BILL_CLOSED: 'bill:closed',
  BILL_SPLIT_CHANGED: 'bill:split_changed',

  // Table
  TABLE_STATUS_CHANGED: 'table:status_changed',
  TABLE_SESSION_STARTED: 'table:session_started',
  TABLE_SESSION_ENDED: 'table:session_ended'
} as const;

// ============================================
// Payload Types
// ============================================

export interface BasePayload {
  timestamp: string;
  restaurantId: string;
}

// Order events
export interface OrderCreatedPayload extends BasePayload {
  orderId: string;
  tableId: string;
  tableName: string;
  items: OrderItemPayload[];
  total: number;
}

export interface OrderUpdatedPayload extends BasePayload {
  orderId: string;
  changes: Partial<OrderPayload>;
}

export interface OrderStatusChangedPayload extends BasePayload {
  orderId: string;
  tableId: string;
  tableName: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
}

export interface OrderCancelledPayload extends BasePayload {
  orderId: string;
  tableId: string;
  reason: string;
  cancelledBy: string;
}

export interface OrderItemPayload {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  options: SelectedOptionPayload[];
}

export interface SelectedOptionPayload {
  optionId: string;
  optionName: string;
  choiceId: string;
  choiceName: string;
  choicePrice: number;
}

export interface OrderPayload {
  id: string;
  tableId: string;
  tableName: string;
  status: string;
  items: OrderItemPayload[];
  subtotal: number;
  serviceCharge: number;
  discount: number;
  total: number;
  notes?: string;
}

// Kitchen events
export interface KitchenOrderReceivedPayload extends BasePayload {
  orderId: string;
  tableName: string;
  tableNumber?: string;
  items: KitchenOrderItemPayload[];
  priority: 'normal' | 'high' | 'urgent';
}

export interface KitchenStatusChangedPayload extends BasePayload {
  orderId: string;
  itemId?: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
}

export interface KitchenAlertPayload extends BasePayload {
  orderId: string;
  tableName: string;
  type: 'cancelled' | 'priority_changed' | 'delayed';
  message: string;
}

export interface KitchenOrderItemPayload {
  id: string;
  productName: string;
  quantity: number;
  notes?: string;
  options: SelectedOptionPayload[];
  status: 'pending' | 'preparing' | 'ready';
}

// Waiter events
export interface WaiterCallCreatedPayload extends BasePayload {
  callId: string;
  tableId: string;
  tableName: string;
  message?: string;
}

export interface WaiterCallRespondedPayload extends BasePayload {
  callId: string;
  tableId: string;
  respondedBy: string;
}

export interface WaiterValidationRequestedPayload extends BasePayload {
  orderId: string;
  tableId: string;
  tableName: string;
  items: OrderItemPayload[];
  total: number;
}

// Billing events
export interface BillUpdatedPayload extends BasePayload {
  billId: string;
  tableId: string;
  total: number;
  splitType: string;
  splitCount: number;
}

export interface BillClosedPayload extends BasePayload {
  billId: string;
  tableId: string;
  total: number;
  closedBy: string;
}

export interface BillSplitChangedPayload extends BasePayload {
  billId: string;
  tableId: string;
  splitType: string;
  splitCount: number;
}

// Table events
export interface TableStatusChangedPayload extends BasePayload {
  tableId: string;
  tableName: string;
  oldStatus: string;
  newStatus: string;
}

export interface TableSessionStartedPayload extends BasePayload {
  tableId: string;
  tableName: string;
  sessionId: string;
}

export interface TableSessionEndedPayload extends BasePayload {
  tableId: string;
  tableName: string;
  sessionId: string;
}

// ============================================
// Client Events (incoming from client)
// ============================================

export interface ClientEvents {
  // Auth
  auth: { token: string; restaurantId?: string };

  // Subscriptions
  'subscribe:orders': { restaurantId: string };
  'subscribe:kitchen': { restaurantId: string };
  'subscribe:waiter': { restaurantId: string };
  'subscribe:billing': { restaurantId: string };
  'subscribe:table': { tableToken: string };

  // Actions
  'order:update_status': { orderId: string; status: string; itemId?: string };
  'kitchen:update_status': { orderId: string; itemId?: string; status: string };
  'waiter:respond_call': { callId: string };
  'waiter:validate_open': { orderId: string; action: 'approve' | 'reject'; reason?: string };
  'billing:split': { billId: string; splitType: string; splitCount?: number };
  'billing:service_charge': { billId: string; enabled: boolean };
  'billing:discount': { billId: string; amount: number };
  'billing:close': { billId: string };
}

// ============================================
// Server Events (outgoing to client)
// ============================================

export interface ServerEvents {
  // Auth
  'auth:success': { userId: string; role: string; restaurantId: string };
  'auth:error': { message: string };

  // Orders
  'order:created': OrderCreatedPayload;
  'order:updated': OrderUpdatedPayload;
  'order:status_changed': OrderStatusChangedPayload;
  'order:cancelled': OrderCancelledPayload;

  // Kitchen
  'kitchen:order_received': KitchenOrderReceivedPayload;
  'kitchen:status_changed': KitchenStatusChangedPayload;
  'kitchen:alert': KitchenAlertPayload;

  // Waiter
  'waiter:call_created': WaiterCallCreatedPayload;
  'waiter:call_responded': WaiterCallRespondedPayload;
  'waiter:validation_requested': WaiterValidationRequestedPayload;

  // Billing
  'bill:updated': BillUpdatedPayload;
  'bill:closed': BillClosedPayload;
  'bill:split_changed': BillSplitChangedPayload;

  // Table
  'table:status_changed': TableStatusChangedPayload;
  'table:session_started': TableSessionStartedPayload;
  'table:session_ended': TableSessionEndedPayload;

  // System
  error: { code: string; message: string };
  pong: { timestamp: string };
}

// ============================================
// Room Names
// ============================================

export const WS_ROOMS = {
  RESTAURANT_ORDERS: (restaurantId: string) => `restaurant:${restaurantId}:orders`,
  RESTAURANT_KITCHEN: (restaurantId: string) => `restaurant:${restaurantId}:kitchen`,
  RESTAURANT_WAITER: (restaurantId: string) => `restaurant:${restaurantId}:waiter`,
  RESTAURANT_BILLING: (restaurantId: string) => `restaurant:${restaurantId}:billing`,
  TABLE: (tableToken: string) => `table:${tableToken}`,
  ADMIN: 'admin'
} as const;

// ============================================
// Helper Functions
// ============================================

export function createPayload<T extends BasePayload>(
  data: Omit<T, 'timestamp' | 'restaurantId'>,
  restaurantId: string
): T {
  return {
    ...data,
    timestamp: new Date().toISOString(),
    restaurantId
  } as T;
}