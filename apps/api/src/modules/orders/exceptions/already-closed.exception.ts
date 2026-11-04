import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class AlreadyClosedException extends ApiHttpException<ApiErrorCode.ALREADY_CLOSED> {
    constructor() {
        super({
            code: ApiErrorCode.ALREADY_CLOSED,
            message: 'The order is already closed',
            details: [],
            status: HttpStatus.FORBIDDEN
        });
    }
}
