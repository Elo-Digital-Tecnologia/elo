import type { ApiResponse } from '@elo/core/api/api-response';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { Injectable, StreamableFile } from '@nestjs/common';
import { map } from 'rxjs';

/** Wraps every HTTP answer in the standard envelope. Files are sent as they are. */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
    T,
    ApiResponse<T> | StreamableFile
> {
    public intercept(
        context: ExecutionContext,
        next: CallHandler<T>
    ): Observable<ApiResponse<T> | StreamableFile> {
        const request = context.switchToHttp().getRequest<Request>();
        return next.handle().pipe(
            map((data) =>
                data instanceof StreamableFile
                    ? data
                    : {
                          success: true,
                          path: request.url,
                          timestamp: new Date().toISOString(),
                          data: data ?? null,
                          error: null
                      }
            )
        );
    }
}
