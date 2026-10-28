import type { OrderStatus, TableState } from './orders';
import type { AccessState } from './subscription';

export interface OptionChoice {
  label: string;
  priceCents: number;
}

export interface OptionGroup {
  name: string;
  required: boolean;
  multiple: boolean;
  choices: OptionChoice[];
}

export interface ProductView {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  available: boolean;
  options: OptionGroup[];
}

export interface CategoryView {
  id: string;
  name: string;
  position: number;
  products: ProductView[];
}

export interface OrderItemView {
  productId: string;
  name: string;
  unitCents: number;
  quantity: number;
  notes?: string;
  options: { group: string; label: string; priceCents: number }[];
}

export interface OrderView {
  id: string;
  tableId: string;
  tableName?: string;
  status: OrderStatus;
  items: OrderItemView[];
  cancelReason: string | null;
  createdAt: string;
  /** Presente em order.cancelled: a cozinha deve destacar o card. */
  alertKitchen?: boolean;
}

export interface TableView {
  id: string;
  name: string;
  state: TableState;
  waiterId: string | null;
  /** Só para administrador do restaurante. */
  token?: string;
}

export interface PublicMenuView {
  readOnly: true;
  restaurant: { name: string; slug: string };
  menu: CategoryView[];
}

export interface SessionStateView {
  readOnly: false;
  restaurant: { name: string; slug: string; serviceFeeBps: number };
  table: { name: string; state: TableState };
  orders: OrderView[];
  menu: CategoryView[];
}

export interface SubscriptionView {
  state: AccessState;
  dueDate: string;
  graceEndsAt: string;
  warning: boolean;
}

export interface WaiterCallView {
  id: string;
  tableId: string;
  tableName?: string;
  createdAt: string;
}

export type FeeWaivedBy = 'customer' | 'staff';

export interface BillAdjustmentView {
  label: string;
  cents: number;
  reason: string | null;
  createdAt: string;
}

export interface BillLineView {
  name: string;
  unitCents: number;
  quantity: number;
  /** Opções escolhidas, já em texto ("Tamanho: Grande"). */
  details: string[];
}

/** Conta da mesa: pedidos válidos da sessão ativa (sem cancelados nem devolvidos). */
export interface BillView {
  tableId: string;
  tableName: string;
  state: TableState;
  serviceFeeBps: number;
  feeWaivedBy: FeeWaivedBy | null;
  lines: BillLineView[];
  adjustments: BillAdjustmentView[];
  subtotalCents: number;
  serviceFeeCents: number;
  adjustmentsCents: number;
  totalCents: number;
}

export interface ReportView {
  from: string;
  to: string;
  totals: {
    /** Soma dos itens dos pedidos válidos (sem taxa de serviço). */
    revenueCents: number;
    orders: number;
    items: number;
    averageTicketCents: number;
    cancelled: number;
    returned: number;
  };
  byDay: { date: string; revenueCents: number; orders: number }[];
  byHour: { hour: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenueCents: number }[];
}
