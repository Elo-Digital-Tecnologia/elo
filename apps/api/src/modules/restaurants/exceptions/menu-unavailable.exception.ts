import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class MenuUnavailableException extends ApiHttpException<ApiErrorCode.MENU_UNAVAILABLE> {
    constructor() {
        super({
            code: ApiErrorCode.MENU_UNAVAILABLE,
            message: 'The menu is unavailable',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
