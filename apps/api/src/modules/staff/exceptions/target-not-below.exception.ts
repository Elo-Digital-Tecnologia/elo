import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class TargetNotBelowException extends ApiHttpException<ApiErrorCode.TARGET_NOT_BELOW> {
    constructor() {
        super({
            code: ApiErrorCode.TARGET_NOT_BELOW,
            message: 'The member is not below you',
            details: [],
            status: HttpStatus.FORBIDDEN
        });
    }
}
