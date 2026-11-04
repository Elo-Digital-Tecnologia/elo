import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class TableNotOpenException extends ApiHttpException<ApiErrorCode.TABLE_NOT_OPEN> {
    constructor() {
        super({
            code: ApiErrorCode.TABLE_NOT_OPEN,
            message: 'The table is not open',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
