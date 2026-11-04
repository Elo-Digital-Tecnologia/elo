import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class TableSessionNotFoundException extends ApiHttpException<ApiErrorCode.TABLE_SESSION_NOT_FOUND> {
    constructor() {
        super({
            code: ApiErrorCode.TABLE_SESSION_NOT_FOUND,
            message: 'Table session not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
