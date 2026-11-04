import type { PauseProblem } from '@elo/core/opening-hours/open-status';
import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidPauseException extends ApiHttpException<ApiErrorCode.INVALID_PAUSE> {
    constructor(problems: PauseProblem[]) {
        super({
            code: ApiErrorCode.INVALID_PAUSE,
            message: 'Invalid pause',
            details: problems.map((code) => ({ code })),
            status: HttpStatus.BAD_REQUEST
        });
    }
}
