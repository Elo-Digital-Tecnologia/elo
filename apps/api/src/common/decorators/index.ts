// Common Decorators — Elo Digital API

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@elo-digital/database/entities/User';
import { JWTPayload } from '@elo-digital/core/types';

/**
 * Get current authenticated user from request
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;
    return data ? user?.[data] : user;
  }
);

/**
 * Get current user's restaurant ID
 */
export const CurrentRestaurant = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User & { restaurantId?: string };
    return data ? user?.[data] : user?.restaurantId;
  }
);

/**
 * Get current user's roles/permissions
 */
export const CurrentPermissions = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User & { permissions?: string[] };
    return data ? user?.permissions?.[data] : user?.permissions;
  }
);

/**
 * Get JWT payload from request
 */
export const JwtPayload = createParamDecorator(
  (data: keyof JWTPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const payload = request.user as JWTPayload;
    return data ? payload?.[data] : payload;
  }
);

/**
 * Get table session from request (for public menu routes)
 */
export const TableSession = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const session = request.tableSession;
    return data ? session?.[data] : session;
  }
);

/**
 * Get request IP address
 */
export const ClientIp = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const ip = request.ip ||
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      'unknown';
    return data ? ip?.[data] : ip;
  }
);

/**
 * Get user agent
 */
export const UserAgent = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const ua = request.headers['user-agent'] || 'unknown';
    return data ? ua?.[data] : ua;
  }
);