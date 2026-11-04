import type { ApiErrorDetail } from '@elo/core/api/api-error-detail';
import type { ApiErrorBody } from '@elo/core/api/api-response';
import type { FieldError } from '@elo/core/fields/field-rules';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { HTTP_STATUS } from './http-status';

/** Code used when the answer is not the API envelope (network or proxy failure). */
const codeForStatus = (status: number): ApiErrorCode =>
    status === HTTP_STATUS.UNAUTHORIZED
        ? ApiErrorCode.UNAUTHORIZED
        : status === HTTP_STATUS.FORBIDDEN
          ? ApiErrorCode.FORBIDDEN
          : status === HTTP_STATUS.NOT_FOUND
            ? ApiErrorCode.NOT_FOUND
            : status === HTTP_STATUS.TOO_MANY_REQUESTS
              ? ApiErrorCode.TOO_MANY_REQUESTS
              : ApiErrorCode.INTERNAL_ERROR;

export class ApiError extends Error {
    public readonly code: ApiErrorCode;
    public readonly details: readonly ApiErrorDetail[];

    constructor(
        public readonly status: number,
        body: ApiErrorBody | null
    ) {
        super(body?.message ?? `HTTP ${status}`);
        this.code = body?.code ?? codeForStatus(status);
        this.details = body?.details ?? [];
    }

    /** Narrows the error to one code, so its details get that code's type. */
    public is<C extends ApiErrorCode>(
        code: C
    ): this is ApiError & { details: ApiErrorDetail<C>[] } {
        return this.code === code;
    }

    /** Details of the error when it has this code, else none. */
    public detailsOf<C extends ApiErrorCode>(code: C): ApiErrorDetail<C>[] {
        return this.is(code) ? this.details : [];
    }

    /** Per-field problems of a validation failure, keyed by path (`items.0.notes`). */
    public get fields(): Record<string, FieldError> {
        return Object.fromEntries(
            this.detailsOf(ApiErrorCode.VALIDATION_FAILED).map(({ field, ...error }) => [
                field,
                error
            ])
        );
    }

    /** The field the error is about (`USERNAME_TAKEN` → `username`), when the API says. */
    public get field(): string | null {
        if (this.code === ApiErrorCode.VALIDATION_FAILED) return null;
        for (const detail of this.details)
            if (
                typeof detail === 'object' &&
                detail &&
                'field' in detail &&
                typeof detail.field === 'string'
            )
                return detail.field;
        return null;
    }
}
