import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class TableNotFoundException extends ApiHttpException<ApiErrorCode.TABLE_NOT_FOUND> {
    constructor() {
        super({
            code: ApiErrorCode.TABLE_NOT_FOUND,
            message: 'Table not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
