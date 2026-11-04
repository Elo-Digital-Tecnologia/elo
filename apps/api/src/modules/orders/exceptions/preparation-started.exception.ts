import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class PreparationStartedException extends ApiHttpException<ApiErrorCode.PREPARATION_STARTED> {
    constructor() {
        super({
            code: ApiErrorCode.PREPARATION_STARTED,
            message: 'The preparation already started',
            details: [],
            status: HttpStatus.FORBIDDEN
        });
    }
}
