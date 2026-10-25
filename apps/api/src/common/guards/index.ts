// Common Guards — Elo Digital API

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserRole, Permission } from '@elo-digital/core/types';
import { ROLE_PERMISSIONS, hasPermission, roleHasPermission } from '@elo-digital/core/rbac';
import { AppConfig } from '../../config/app.config';

// Custom metadata keys
export const IS_PUBLIC_KEY = 'isPublic';
export const REQUIRED_ROLE_KEY = 'requiredRole';
export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';
export const REQUIRED_ANY_PERMISSION_KEY = 'requiredAnyPermission';

export const Public = () => (target: object | Function, propertyKey?: string | symbol) => {
  Reflect.defineMetadata(IS_PUBLIC_KEY, true, target, propertyKey);
};

export const RequireRole = (role: UserRole) => (target: object | Function, propertyKey?: string | symbol) => {
  Reflect.defineMetadata(REQUIRED_ROLE_KEY, role, target, propertyKey);
};

export const RequirePermissions = (...permissions: Permission[]) => (target: object | Function, propertyKey?: string | symbol) => {
  Reflect.defineMetadata(REQUIRED_PERMISSIONS_KEY, permissions, target, propertyKey);
};

export const RequireAnyPermission = (...permissions: Permission[]) => (target: object | Function, propertyKey?: string | symbol) => {
  Reflect.defineMetadata(REQUIRED_ANY_PERMISSION_KEY, permissions, target, propertyKey);
};

/**
 * JWT Authentication Guard
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly appConfig: AppConfig
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token de acesso não fornecido');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.appConfig.jwt.secret
      });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  private extractToken(request: Request): string | null {
    // Check Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Check cookie (for table sessions)
    if (request.cookies?.session) {
      return request.cookies.session;
    }

    return null;
  }
}

/**
 * Role-Based Access Control Guard
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.getAllAndOverride<UserRole>(
      REQUIRED_ROLE_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRole) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { role?: UserRole };

    if (!user?.role) {
      throw new ForbiddenException('Usuário sem role definida');
    }

    if (!roleHasPermission(user.role, requiredRole)) {
      throw new ForbiddenException(`Acesso negado. Requer role: ${requiredRole}`);
    }

    return true;
  }
}

/**
 * Permission-Based Access Control Guard
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    const requiredAnyPermission = this.reflector.getAllAndOverride<Permission[]>(
      REQUIRED_ANY_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions && !requiredAnyPermission) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { role?: UserRole; permissions?: Permission[] };

    if (!user?.role) {
      throw new ForbiddenException('Usuário sem role definida');
    }

    // Check required permissions (ALL must be present)
    if (requiredPermissions) {
      const userPermissions = user.permissions || ROLE_PERMISSIONS[user.role] || [];
      const missing = requiredPermissions.filter(p => !userPermissions.includes(p));

      if (missing.length > 0) {
        throw new ForbiddenException(`Permissões faltando: ${missing.join(', ')}`);
      }
    }

    // Check any permission (AT LEAST ONE must be present)
    if (requiredAnyPermission) {
      const userPermissions = user.permissions || ROLE_PERMISSIONS[user.role] || [];
      const hasAny = requiredAnyPermission.some(p => userPermissions.includes(p));

      if (!hasAny) {
        throw new ForbiddenException(`Requer uma das permissões: ${requiredAnyPermission.join(', ')}`);
      }
    }

    return true;
  }
}

/**
 * Multi-tenant isolation guard
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { restaurantId?: string; role?: UserRole };

    // Superadmin and admin_elo can access all restaurants
    if (user?.role === 'superadmin' || user?.role === 'admin_elo') {
      return true;
    }

    // For other roles, ensure restaurantId is present
    if (!user?.restaurantId) {
      throw new ForbiddenException('Usuário não associado a um restaurante');
    }

    // Attach restaurantId to request for easy access
    request.restaurantId = user.restaurantId;
    return true;
  }
}

/**
 * Table session guard (for public menu routes)
 */
@Injectable()
export class TableSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Check for session cookie
    const sessionToken = request.cookies?.session;
    if (!sessionToken) {
      throw new UnauthorizedException('Sessão de mesa não encontrada');
    }

    // In real implementation, validate session against database
    // For now, just attach to request
    request.tableSession = { token: sessionToken };
    return true;
  }
}

/**
 * Rate limiting guard for public routes
 */
@Injectable()
export class PublicRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // This would integrate with @nestjs/throttler
    // Custom logic for stricter limits on public routes
    return true;
  }
}