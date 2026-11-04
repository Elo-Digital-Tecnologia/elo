import type { SuspensionReason } from '../../billing/billing.js';
import type {
    BillingPlan,
    ContractKind,
    ContractState,
    TrialStatus
} from '../../contracts/contracts.js';
import type { Availability, OpeningHours } from '../../opening-hours/open-status.js';
import type { AccessState, RestaurantStatus } from '../../subscription/subscription.js';
import type { CategoryView } from './catalog.view.js';

/** Public restaurant data, shown at the top of the menu. */
export interface RestaurantProfileView {
    description: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    address: string | null;
    phone: string | null;
    instagram: string | null;
    /** Google review (or place) link the guests are invited to; null when the restaurant has none. */
    googleReviewUrl: string | null;
    /** Computed by the server in the restaurant's time zone, closures included. */
    availability: Availability;
}

export interface PublicMenuView {
    readOnly: true;
    restaurant: { name: string; slug: string } & RestaurantProfileView;
    menu: CategoryView[];
}

export interface SubscriptionView {
    state: AccessState;
    dueDate: string;
    graceEndsAt: string;
    warning: boolean;
    /** Why the team is locked out, empty while it is not. */
    reasons: SuspensionReason[];
    /** What the restaurant pays now: the plan signed in the contract in force, or a later amendment. */
    plan: BillingPlan | null;
    /** The one status shown for the restaurant (pending and ended contracts apart from suspensions). */
    status: RestaurantStatus;
    /** Free trial of the first pilot contract. */
    trial: TrialStatus;
    /** Whether a signed contract is in force, and until when (renewals included). */
    contract: {
        state: ContractState;
        endsOn: string | null;
        daysLeft: number | null;
        nextStartsOn: string | null;
        /** The latest contract registered was voided by the Elo team. */
        voided: { kind: ContractKind | null; at: string } | null;
    };
}

/** Full restaurant data for the panel. */
export interface RestaurantSettingsView extends RestaurantProfileView {
    guestFeeRefusal: boolean;
    wifiName: string | null;
    wifiPassword: string | null;
    openingHours: OpeningHours | null;
}

/** Filters of the Elo restaurant list. `attention` = in grace or suspended. */
export const RESTAURANT_LIST_STATUSES = [
    'active',
    'grace',
    'suspended',
    'pending',
    'ended',
    'attention',
    'deleted'
] as const;
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
    counts: {
        all: number;
        active: number;
        grace: number;
        suspended: number;
        pending: number;
        ended: number;
        deleted?: number | undefined;
    };
}
