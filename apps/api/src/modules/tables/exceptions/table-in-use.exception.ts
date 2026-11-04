import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class TableInUseException extends ApiHttpException<ApiErrorCode.TABLE_IN_USE> {
    constructor() {
        super({
            code: ApiErrorCode.TABLE_IN_USE,
            message: 'The table is in use',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
