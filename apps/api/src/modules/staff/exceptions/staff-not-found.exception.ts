import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class StaffNotFoundException extends ApiHttpException<ApiErrorCode.STAFF_NOT_FOUND> {
    constructor() {
        super({
            code: ApiErrorCode.STAFF_NOT_FOUND,
            message: 'Staff member not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
