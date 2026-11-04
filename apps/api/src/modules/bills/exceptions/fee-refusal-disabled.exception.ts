import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class FeeRefusalDisabledException extends ApiHttpException<ApiErrorCode.FEE_REFUSAL_DISABLED> {
    constructor() {
        super({
            code: ApiErrorCode.FEE_REFUSAL_DISABLED,
            message: 'Refusing the service fee is disabled',
            details: [],
            status: HttpStatus.FORBIDDEN
        });
    }
}
