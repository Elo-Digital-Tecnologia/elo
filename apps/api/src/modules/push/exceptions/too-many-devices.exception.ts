import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class TooManyDevicesException extends ApiHttpException<ApiErrorCode.TOO_MANY_DEVICES> {
    constructor() {
        super({
            code: ApiErrorCode.TOO_MANY_DEVICES,
            message: 'Too many devices',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
