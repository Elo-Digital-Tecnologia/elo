import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class TargetIsSelfException extends ApiHttpException<ApiErrorCode.TARGET_IS_SELF> {
    constructor() {
        super({
            code: ApiErrorCode.TARGET_IS_SELF,
            message: 'This action cannot target yourself',
            details: [],
            status: HttpStatus.FORBIDDEN
        });
    }
}
