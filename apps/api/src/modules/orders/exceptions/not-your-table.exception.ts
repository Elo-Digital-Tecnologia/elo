import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class NotYourTableException extends ApiHttpException<ApiErrorCode.NOT_YOUR_TABLE> {
    constructor() {
        super({
            code: ApiErrorCode.NOT_YOUR_TABLE,
            message: 'The table is not yours',
            details: [],
            status: HttpStatus.FORBIDDEN
        });
    }
}
