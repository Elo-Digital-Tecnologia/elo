import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class ActiveTableElsewhereException extends ApiHttpException<ApiErrorCode.ACTIVE_TABLE_ELSEWHERE> {
    constructor(tableName: string) {
        super({
            code: ApiErrorCode.ACTIVE_TABLE_ELSEWHERE,
            message: 'The device already has an active session at another table',
            details: [{ tableName }],
            status: HttpStatus.CONFLICT
        });
    }
}
