import type { ApiStaffBusyDetail } from '@elo/core/api/api-error-detail';
import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class StaffBusyException extends ApiHttpException<ApiErrorCode.STAFF_BUSY> {
    constructor(busy: ApiStaffBusyDetail) {
        super({
            code: ApiErrorCode.STAFF_BUSY,
            message: 'The member is serving tables',
            details: [busy],
            status: HttpStatus.CONFLICT
        });
    }
}
