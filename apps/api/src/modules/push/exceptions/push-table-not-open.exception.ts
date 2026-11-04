import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class PushTableNotOpenException extends ApiHttpException<ApiErrorCode.PUSH_TABLE_NOT_OPEN> {
    constructor() {
        super({
            code: ApiErrorCode.PUSH_TABLE_NOT_OPEN,
            message: 'Table news are only sent while the table is open',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
