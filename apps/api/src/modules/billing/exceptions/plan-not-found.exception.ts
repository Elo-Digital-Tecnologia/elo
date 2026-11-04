import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class PlanNotFoundException extends ApiHttpException<ApiErrorCode.PLAN_NOT_FOUND> {
    constructor() {
        super({
            code: ApiErrorCode.PLAN_NOT_FOUND,
            message: 'Plan not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
