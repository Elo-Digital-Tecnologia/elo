import type { ApiErrorCode } from '@elo/core/api/api-error-code';
import type { ApiErrorDetail } from '@elo/core/api/api-error-detail';
import type { ApiErrorBody } from '@elo/core/api/api-response';
import type { HttpStatus } from '@nestjs/common';
import { HttpException } from '@nestjs/common';

export interface ApiHttpExceptionOptions<C extends ApiErrorCode> {
    code: C;
    message: string;
    details: ApiErrorDetail<C>[];
    status: HttpStatus;
}

/** Base of every error the API answers with: an HTTP status plus a code from `ApiErrorCode`. */
export class ApiHttpException<
    C extends ApiErrorCode = ApiErrorCode
> extends HttpException {
    public readonly code: C;
    public readonly details: ApiErrorDetail<C>[];

    constructor({ code, message, details, status }: ApiHttpExceptionOptions<C>) {
        super(message, status);
        this.code = code;
        this.details = details;
    }

    public toBody(): ApiErrorBody<C> {
        return { code: this.code, message: this.message, details: this.details };
    }
}
