import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class DatabaseUnavailableException extends ApiHttpException<ApiErrorCode.DATABASE_UNAVAILABLE> {
    constructor() {
        super({
            code: ApiErrorCode.DATABASE_UNAVAILABLE,
            message: 'The database is unavailable',
            details: [],
            status: HttpStatus.SERVICE_UNAVAILABLE
        });
    }
}
