import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class NotLatestEntryException extends ApiHttpException<ApiErrorCode.NOT_LATEST_ENTRY> {
    constructor() {
        super({
            code: ApiErrorCode.NOT_LATEST_ENTRY,
            message: 'Only the latest entry can be changed',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
