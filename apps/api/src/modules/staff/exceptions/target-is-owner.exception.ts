import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class TargetIsOwnerException extends ApiHttpException<ApiErrorCode.TARGET_IS_OWNER> {
    constructor() {
        super({
            code: ApiErrorCode.TARGET_IS_OWNER,
            message: 'The owner cannot be changed this way',
            details: [],
            status: HttpStatus.FORBIDDEN
        });
    }
}
