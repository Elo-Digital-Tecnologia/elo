import type { ApiErrorCode } from './api-error-code.js';
import type { ApiErrorDetail } from './api-error-detail.js';

export interface ApiErrorBody<C extends ApiErrorCode = ApiErrorCode> {
    code: C;
    message: string;
    details: ApiErrorDetail<C>[];
}

/** Envelope of every HTTP answer of the API. */
export interface ApiResponse<T = unknown> {
    success: boolean;
    path: string;
    timestamp: string;
    data: T | null;
    error: ApiErrorBody | null;
}
