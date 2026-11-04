import type { DueDateProblem } from '@elo/core/billing/billing';
import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidDueDateException extends ApiHttpException<ApiErrorCode.INVALID_DUE_DATE> {
    constructor(problems: DueDateProblem[]) {
        super({
            code: ApiErrorCode.INVALID_DUE_DATE,
            message: 'Invalid due date',
            details: problems.map((code) => ({ code })),
            status: HttpStatus.BAD_REQUEST
        });
    }
}
