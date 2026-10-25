// Common Middleware — Elo Digital API

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID middleware
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const requestId = (request.headers['x-request-id'] as string) || uuidv4();
    request.headers['x-request-id'] = requestId;
    response.setHeader('X-Request-ID', requestId);
    next();
  }
}

/**
 * Security headers middleware
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    // Prevent clickjacking
    response.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    response.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS protection
    response.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    next();
  }
}

/**
 * Request sanitization middleware
 */
@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    // Sanitize body
    if (request.body) {
      request.body = this.sanitize(request.body);
    }

    // Sanitize query
    if (request.query) {
      request.query = this.sanitize(request.query);
    }

    // Sanitize params
    if (request.params) {
      request.params = this.sanitize(request.params);
    }

    next();
  }

  private sanitize(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Basic XSS prevention
        sanitized[key] = value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

/**
 * Request timeout middleware
 */
@Injectable()
export class TimeoutMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const timeout = 30000; // 30 seconds

    const timeoutId = setTimeout(() => {
      if (!response.headersSent) {
        response.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Tempo limite da requisição excedido',
            statusCode: 408
          }
        });
      }
    }, timeout);

    response.on('finish', () => clearTimeout(timeoutId));
    response.on('close', () => clearTimeout(timeoutId));

    next();
  }
}

/**
 * API versioning middleware
 */
@Injectable()
export class VersionMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    // Extract version from URL or header
    const version = request.headers['accept-version'] as string || '1';
    request.apiVersion = version;
    response.setHeader('API-Version', version);
    next();
  }
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
    }
  }
}