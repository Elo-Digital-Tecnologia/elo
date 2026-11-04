import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class UseReturnException extends ApiHttpException<ApiErrorCode.USE_RETURN> {
    constructor() {
        super({
            code: ApiErrorCode.USE_RETURN,
            message: 'A ready order is returned, not cancelled',
            details: [],
            status: HttpStatus.FORBIDDEN
        });
    }
}
