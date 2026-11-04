import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class SlugReservedException extends ApiHttpException<ApiErrorCode.SLUG_RESERVED> {
    constructor(field: string) {
        super({
            code: ApiErrorCode.SLUG_RESERVED,
            message: 'The link is reserved',
            details: [{ field }],
            status: HttpStatus.CONFLICT
        });
    }
}
