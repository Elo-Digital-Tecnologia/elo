import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class NothingToSuspendException extends ApiHttpException<ApiErrorCode.NOTHING_TO_SUSPEND> {
    constructor() {
        super({
            code: ApiErrorCode.NOTHING_TO_SUSPEND,
            message: 'Nothing to suspend',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
