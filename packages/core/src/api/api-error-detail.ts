import type { DueDateProblem, PaymentProblem } from '../billing/billing.js';
import type { ContractProblem } from '../contracts/contracts.js';
import type { FieldError, FieldErrorCode } from '../fields/field-rules.js';
import type { Availability, PauseProblem } from '../opening-hours/open-status.js';
import type { TableState } from '../tables/table-state.js';
import type { ApiErrorCode } from './api-error-code.js';

/** A property of the request body or query that failed validation. */
export interface ApiFieldErrorDetail {
    field: string;
    code: FieldErrorCode;
    params?: FieldError['params'] | undefined;
}

/** The request property an error is about, without a validation code. */
export interface ApiFieldReferenceDetail {
    field: string;
}

/** A rule from `@elo/core` that refused the input (payment, contract, due date, pause). */
export interface ApiProblemDetail<P extends string = string> {
    code: P;
}

export interface ApiSubscriptionSuspendedDetail {
    status: string;
    reasons: string[];
    contractEndsOn: string | null;
    contractStartsOn: string | null;
}

export interface ApiStaffBusyDetail {
    tables: string[];
}

export interface ApiAlreadyHandledDetail {
    /** Who handled it first. */
    by: string | null;
    /** The table state after it was handled, for table actions. */
    state?: TableState | undefined;
}

export interface ApiCannotGrantDetail {
    permissions: string[];
}

export interface ApiRestaurantClosedDetail {
    availability: Availability;
}

export interface ApiActiveTableElsewhereDetail {
    /** The table this device is already at. */
    tableName: string;
}

/** Detail items each code carries. Codes not listed carry field references, or nothing. */
export interface ApiErrorDetailMap {
    [ApiErrorCode.VALIDATION_FAILED]: ApiFieldErrorDetail;
    [ApiErrorCode.SUBSCRIPTION_SUSPENDED]: ApiSubscriptionSuspendedDetail;
    [ApiErrorCode.STAFF_BUSY]: ApiStaffBusyDetail;
    [ApiErrorCode.ALREADY_HANDLED]: ApiAlreadyHandledDetail;
    [ApiErrorCode.CANNOT_GRANT]: ApiCannotGrantDetail;
    [ApiErrorCode.RESTAURANT_CLOSED]: ApiRestaurantClosedDetail;
    [ApiErrorCode.ACTIVE_TABLE_ELSEWHERE]: ApiActiveTableElsewhereDetail;
    [ApiErrorCode.INVALID_PAYMENT]: ApiProblemDetail<PaymentProblem>;
    [ApiErrorCode.INVALID_DUE_DATE]: ApiProblemDetail<DueDateProblem>;
    [ApiErrorCode.INVALID_CONTRACT]: ApiProblemDetail<ContractProblem>;
    [ApiErrorCode.INVALID_PAUSE]: ApiProblemDetail<PauseProblem>;
}

export type ApiErrorDetail<C extends ApiErrorCode = ApiErrorCode> =
    C extends keyof ApiErrorDetailMap ? ApiErrorDetailMap[C] : ApiFieldReferenceDetail;
