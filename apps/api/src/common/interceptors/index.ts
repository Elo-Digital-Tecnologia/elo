// Common Interceptors — Elo Digital API

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Logging interceptor for request/response
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const startTime = Date.now();

    this.logger.log(`${method} ${url} - ${ip} - ${userAgent}`);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(`${method} ${url} - ${response.statusCode} - ${duration}ms`);
      }),
      catchError(error => {
        const duration = Date.now() - startTime;
        this.logger.error(`${method} ${url} - ${error.status || 500} - ${duration}ms - ${error.message}`);
        throw error;
      })
    );
  }
}

/**
 * Transform response to standard format
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { success: boolean; data: T; meta: object }> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<{ success: boolean; data: T; meta: object }> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      tap(data => {
        if (data && typeof data === 'object' && 'success' in data) {
          // Already formatted
          return;
        }
      })
    );
  }
}

/**
 * Cache control headers
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest<Request>();

    // No cache for mutations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
    }

    return next.handle();
  }
}

/**
 * Request ID tracking
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const requestId = (headers['x-request-id'] as string) ||
      crypto.randomUUID();

    request.headers['x-request-id'] = requestId;
    response.setHeader('X-Request-ID', requestId);

    return next.handle();
  }
}