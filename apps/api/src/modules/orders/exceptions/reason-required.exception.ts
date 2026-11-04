import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class ReasonRequiredException extends ApiHttpException<ApiErrorCode.REASON_REQUIRED> {
    constructor() {
        super({
            code: ApiErrorCode.REASON_REQUIRED,
            message: 'A reason is required',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
