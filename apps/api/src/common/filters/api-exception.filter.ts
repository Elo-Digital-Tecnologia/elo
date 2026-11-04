import type { ApiResponse } from '@elo/core/api/api-response';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AccessDeniedException } from '#/common/exceptions/access-denied.exception.js';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';
import { AuthenticationRequiredException } from '#/common/exceptions/authentication-required.exception.js';
import { DependencyUnavailableException } from '#/common/exceptions/dependency-unavailable.exception.js';
import { InternalErrorException } from '#/common/exceptions/internal-error.exception.js';
import { InvalidRequestException } from '#/common/exceptions/invalid-request.exception.js';
import { RateLimitExceededException } from '#/common/exceptions/rate-limit-exceeded.exception.js';
import { RequestTooLargeException } from '#/common/exceptions/request-too-large.exception.js';
import { ResourceConflictException } from '#/common/exceptions/resource-conflict.exception.js';
import { ResourceNotFoundException } from '#/common/exceptions/resource-not-found.exception.js';

const BY_STATUS: Partial<Record<number, () => ApiHttpException>> = {
    [HttpStatus.BAD_REQUEST]: () => new InvalidRequestException(),
    [HttpStatus.UNAUTHORIZED]: () => new AuthenticationRequiredException(),
    [HttpStatus.FORBIDDEN]: () => new AccessDeniedException(),
    [HttpStatus.NOT_FOUND]: () => new ResourceNotFoundException(),
    [HttpStatus.CONFLICT]: () => new ResourceConflictException(),
    [HttpStatus.PAYLOAD_TOO_LARGE]: () => new RequestTooLargeException(),
    [HttpStatus.TOO_MANY_REQUESTS]: () => new RateLimitExceededException(),
    [HttpStatus.SERVICE_UNAVAILABLE]: () => new DependencyUnavailableException()
};

/** Status of errors raised outside Nest, such as an invalid or oversized JSON body. */
const statusOf = (exception: unknown): number | null => {
    if (exception instanceof HttpException) return exception.getStatus();
    if (typeof exception !== 'object' || exception === null) return null;
    const status = (exception as { status?: unknown }).status;
    return typeof status === 'number' &&
        status >= HttpStatus.BAD_REQUEST &&
        status < HttpStatus.INTERNAL_SERVER_ERROR
        ? status
        : null;
};

/** Answers every HTTP error in the standard envelope, with a code from `ApiErrorCode`. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(ApiExceptionFilter.name);

    public catch(exception: unknown, host: ArgumentsHost): void {
        const http = host.switchToHttp();
        const request = http.getRequest<Request>();
        const response = http.getResponse<Response>();
        const error = this.toApiException(exception);
        if (error.getStatus() >= HttpStatus.INTERNAL_SERVER_ERROR)
            this.logger.error(exception instanceof Error ? exception.stack : exception);

        const body: ApiResponse<null> = {
            success: false,
            path: request.url,
            timestamp: new Date().toISOString(),
            data: null,
            error: error.toBody()
        };
        response.status(error.getStatus()).json(body);
    }

    private toApiException(exception: unknown): ApiHttpException {
        if (exception instanceof ApiHttpException) return exception;
        const status = statusOf(exception);
        return (status !== null && BY_STATUS[status]?.()) || new InternalErrorException();
    }
}
