import type { TableState } from '../../tables/table-state.js';
import type { CategoryView } from './catalog.view.js';
import type { OrderView } from './order.view.js';
import type { RestaurantProfileView } from './restaurant.view.js';

export interface TableView {
    id: string;
    name: string;
    state: TableState;
    waiterId: string | null;
    /** Full name of the waiter serving the table. */
    waiterName?: string | null | undefined;
    /** Restaurant admins only. */
    token?: string | undefined;
}

export interface SessionStateView {
    readOnly: false;
    restaurant: {
        name: string;
        slug: string;
        serviceFeeBps: number;
        guestFeeRefusal: boolean;
        wifi: { name: string | null; password: string | null } | null;
    } & RestaurantProfileView;
    table: { name: string; state: TableState; waiterName: string | null };
    orders: OrderView[];
    menu: CategoryView[];
    /** Credential for the live feed: the socket's origin may not receive the session cookie. */
    realtimeTicket: string;
}

export interface WaiterCallView {
    id: string;
    tableId: string;
    tableName?: string | undefined;
    createdAt: string;
}
