import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class SlugTakenException extends ApiHttpException<ApiErrorCode.SLUG_TAKEN> {
    constructor(field: string) {
        super({
            code: ApiErrorCode.SLUG_TAKEN,
            message: 'The link is already taken',
            details: [{ field }],
            status: HttpStatus.CONFLICT
        });
    }
}
