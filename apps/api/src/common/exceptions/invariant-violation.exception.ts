import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from './api.exception.js';

/** A broken internal rule: answered as an internal error, with the reason kept for the logs. */
export class InvariantViolationException extends ApiHttpException {
    constructor(reason: string) {
        super({
            code: ApiErrorCode.INTERNAL_ERROR,
            message: reason,
            details: [],
            status: HttpStatus.INTERNAL_SERVER_ERROR
        });
    }

    public override toBody() {
        return { ...super.toBody(), message: 'Internal server error' };
    }
}
