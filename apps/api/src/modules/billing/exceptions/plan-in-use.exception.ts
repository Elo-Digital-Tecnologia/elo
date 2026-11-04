import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class PlanInUseException extends ApiHttpException<ApiErrorCode.PLAN_IN_USE> {
    constructor() {
        super({
            code: ApiErrorCode.PLAN_IN_USE,
            message: 'The plan is in use',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
