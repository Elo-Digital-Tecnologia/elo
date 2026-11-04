import type { ContractProblem } from '@elo/core/contracts/contracts';
import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidContractException extends ApiHttpException<ApiErrorCode.INVALID_CONTRACT> {
    constructor(problems: ContractProblem[]) {
        super({
            code: ApiErrorCode.INVALID_CONTRACT,
            message: 'Invalid contract',
            details: problems.map((code) => ({ code })),
            status: HttpStatus.BAD_REQUEST
        });
    }
}
