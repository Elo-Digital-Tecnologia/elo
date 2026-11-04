import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidSlugException extends ApiHttpException<ApiErrorCode.INVALID_SLUG> {
    constructor(field: string) {
        super({
            code: ApiErrorCode.INVALID_SLUG,
            message: 'Invalid link',
            details: [{ field }],
            status: HttpStatus.CONFLICT
        });
    }
}
