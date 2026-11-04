import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class PlanInactiveException extends ApiHttpException<ApiErrorCode.PLAN_INACTIVE> {
    constructor() {
        super({
            code: ApiErrorCode.PLAN_INACTIVE,
            message: 'The plan is inactive',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
