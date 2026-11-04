import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidDateException extends ApiHttpException<ApiErrorCode.INVALID_DATE> {
    constructor(field: string) {
        super({
            code: ApiErrorCode.INVALID_DATE,
            message: 'Invalid date',
            details: [{ field }],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
