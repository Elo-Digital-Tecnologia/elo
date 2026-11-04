import type { ApiSubscriptionSuspendedDetail } from '@elo/core/api/api-error-detail';
import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class SubscriptionSuspendedException extends ApiHttpException<ApiErrorCode.SUBSCRIPTION_SUSPENDED> {
    constructor(suspension: ApiSubscriptionSuspendedDetail) {
        super({
            code: ApiErrorCode.SUBSCRIPTION_SUSPENDED,
            message: 'The restaurant subscription is suspended',
            details: [suspension],
            status: HttpStatus.FORBIDDEN
        });
    }
}
