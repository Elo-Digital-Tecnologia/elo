import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class NothingOwedException extends ApiHttpException<ApiErrorCode.NOTHING_OWED> {
    constructor() {
        super({
            code: ApiErrorCode.NOTHING_OWED,
            message: 'Nothing is owed',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
