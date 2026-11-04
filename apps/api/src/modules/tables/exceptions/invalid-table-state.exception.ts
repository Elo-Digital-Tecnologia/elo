import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidTableStateException extends ApiHttpException<ApiErrorCode.INVALID_TABLE_STATE> {
    constructor() {
        super({
            code: ApiErrorCode.INVALID_TABLE_STATE,
            message: 'The table cannot do this now',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
