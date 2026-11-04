import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class TrialOverException extends ApiHttpException<ApiErrorCode.TRIAL_OVER> {
    constructor() {
        super({
            code: ApiErrorCode.TRIAL_OVER,
            message: 'The trial is over',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
