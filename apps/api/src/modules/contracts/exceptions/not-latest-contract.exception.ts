import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class NotLatestContractException extends ApiHttpException<ApiErrorCode.NOT_LATEST_CONTRACT> {
    constructor() {
        super({
            code: ApiErrorCode.NOT_LATEST_CONTRACT,
            message: 'Only the latest contract can be changed',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
