import type { ApiFieldErrorDetail } from '@elo/core/api/api-error-detail';
import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from './api.exception.js';

export class ValidationFailedException extends ApiHttpException<ApiErrorCode.VALIDATION_FAILED> {
    constructor(details: ApiFieldErrorDetail[]) {
        super({
            code: ApiErrorCode.VALIDATION_FAILED,
            message: 'Validation failed',
            details,
            status: HttpStatus.BAD_REQUEST
        });
    }
}
