// Common Filters — Elo Digital API

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiError } from '@elo-digital/core/types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: ApiError;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      errorResponse = {
        code: exception.name,
        message: typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as Record<string, unknown>)['message'] as string || exception.message,
        details: typeof exceptionResponse === 'object' ? exceptionResponse as Record<string, unknown> : undefined,
        statusCode: status
      };
    } else if (exception instanceof Error) {
      errorResponse = {
        code: 'INTERNAL_ERROR',
        message: exception.message,
        statusCode: status
      };
    } else {
      errorResponse = {
        code: 'UNKNOWN_ERROR',
        message: 'Erro interno do servidor',
        statusCode: status
      };
    }

    // Log error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${errorResponse.message}`,
      exception instanceof Error ? exception.stack : undefined
    );

    // Send response
    response.status(status).json({
      success: false,
      error: errorResponse,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.headers['x-request-id'] as string || 'unknown',
        version: process.env.npm_package_version || '1.0.0'
      }
    });
  }
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      success: false,
      error: {
        code: exception.name,
        message: typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as Record<string, unknown>)['message'] as string || exception.message,
        details: typeof exceptionResponse === 'object' ? exceptionResponse as Record<string, unknown> : undefined,
        statusCode: status
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.headers['x-request-id'] as string || 'unknown',
        version: process.env.npm_package_version || '1.0.0'
      }
    };

    response.status(status).json(errorResponse);
  }
}