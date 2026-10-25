// WebSocket Guards — Elo Digital API

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new WsException('Token não fornecido');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      client.data.user = payload;
      return true;
    } catch {
      throw new WsException('Token inválido ou expirado');
    }
  }
}

@Injectable()
export class WsTableSessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const tableToken = client.handshake.auth?.tableToken || client.handshake.query?.tableToken;

    if (!tableToken) {
      throw new WsException('Token da mesa não fornecido');
    }

    // In real implementation, validate against database
    // For now, just attach to client
    client.data.tableToken = tableToken;
    return true;
  }
}

@Injectable()
export class WsPermissionGuard implements CanActivate {
  constructor(private readonly requiredPermission: string) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const user = client.data.user;

    if (!user?.permissions?.includes(this.requiredPermission)) {
      throw new WsException(`Permissão necessária: ${this.requiredPermission}`);
    }

    return true;
  }
}

export function RequireWsPermission(permission: string) {
  return new WsPermissionGuard(permission);
}