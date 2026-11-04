import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class NoPlanException extends ApiHttpException<ApiErrorCode.NO_PLAN> {
    constructor() {
        super({
            code: ApiErrorCode.NO_PLAN,
            message: 'The restaurant has no plan',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
