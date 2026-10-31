import type { OrderStatus, TableState } from './orders';
import type { ProductTag } from './catalog';
import type { Availability, OpeningHours } from './open-status';
import type { Role } from './roles';
import type { AccessState } from './subscription';
import type { SuspensionReason } from './billing';

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
  featured: boolean;
  tags: ProductTag[];
  position: number;
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
  /** Full name of the waiter serving the table. */
  waiterName?: string | null;
  /** Só para administrador do restaurante. */
  token?: string;
}

/** Dados públicos do restaurante, mostrados no topo do cardápio. */
export interface RestaurantProfileView {
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  address: string | null;
  phone: string | null;
  instagram: string | null;
  /** Computed by the server in the restaurant's time zone, closures included. */
  availability: Availability;
}

export interface PublicMenuView {
  readOnly: true;
  restaurant: { name: string; slug: string } & RestaurantProfileView;
  menu: CategoryView[];
}

export interface SessionStateView {
  readOnly: false;
  restaurant: { name: string; slug: string; serviceFeeBps: number; wifi: { name: string | null; password: string | null } | null } & RestaurantProfileView;
  table: { name: string; state: TableState; waiterName: string | null };
  orders: OrderView[];
  menu: CategoryView[];
}

export interface SubscriptionView {
  state: AccessState;
  dueDate: string;
  graceEndsAt: string;
  warning: boolean;
  /** Why the team is locked out, empty while it is not. */
  reasons: SuspensionReason[];
  plan: { id: string; name: string; priceCents: number; cycleMonths: number } | null;
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
  /** The restaurant lets guests refuse the service fee themselves. */
  guestCanRefuseFee: boolean;
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

export interface StaffPerformanceRow {
  id: string;
  name: string;
  roles: Role[];
  archived: boolean;
  callsAnswered: number;
  /** Average seconds from the guest's call to a waiter taking it; null without calls. */
  avgCallSeconds: number | null;
  tablesOpened: number;
  /** Average seconds from the opening request to the waiter's validation. */
  avgOpenSeconds: number | null;
  tablesClosed: number;
}

export interface StaffReportView {
  from: string;
  to: string;
  rows: StaffPerformanceRow[];
}

/** Dados completos do restaurante para o painel. */
export interface RestaurantSettingsView extends RestaurantProfileView {
  guestFeeRefusal: boolean;
  wifiName: string | null;
  wifiPassword: string | null;
  openingHours: OpeningHours | null;
}

export interface ReviewView {
  id: string;
  stars: number;
  comment: string | null;
  tableName: string;
  createdAt: string;
}

export interface ReviewSummaryView {
  count: number;
  /** Média de 1 a 5 com uma casa; 0 sem avaliações. */
  average: number;
  reviews: ReviewView[];
}

/** Filters of the Elo restaurant list. `attention` = in grace or suspended. */
export const RESTAURANT_LIST_STATUSES = ['active', 'grace', 'suspended', 'attention', 'deleted'] as const;
export type RestaurantListStatus = (typeof RESTAURANT_LIST_STATUSES)[number];

export interface RestaurantListItem {
  id: string;
  slug: string;
  name: string;
  managerName: string;
  managerContact: string;
  dueDate: string;
  suspended: boolean;
  createdAt: string;
  subscription: SubscriptionView;
  deletedAt: string | null;
  /** When the data of a deleted restaurant is erased for good. */
  purgeAt: string | null;
}

export interface RestaurantListView {
  items: RestaurantListItem[];
  total: number;
  page: number;
  pageSize: number;
  /** Totals per status, ignoring the status filter, for the filter chips. `deleted` only for who may see it. */
  counts: { all: number; active: number; grace: number; suspended: number; deleted?: number };
}

export interface PauseView {
  id: string;
  startsAt: string;
  endsAt: string | null;
  endedAt: string | null;
  reason: string | null;
  createdByName: string;
  createdAt: string;
}

export interface PauseList {
  availability: Availability;
  /** Current and scheduled closures, soonest first. */
  upcoming: PauseView[];
  /** Closures that already happened, newest first, one page at a time. */
  past: { items: PauseView[]; total: number; page: number; pageSize: number };
}
