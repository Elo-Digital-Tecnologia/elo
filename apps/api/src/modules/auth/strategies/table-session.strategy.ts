// Table Session Strategy — Elo Digital API
// For public menu access via table token/session cookie

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { TableToken } from '@elo-digital/database/entities/TableToken';
import { TableSession } from '@elo-digital/database/entities/TableSession';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class TableSessionStrategy extends PassportStrategy(Strategy, 'table-session') {
  constructor(
    @InjectRepository(TableToken)
    private readonly tableTokenRepository: Repository<TableToken>,
    @InjectRepository(TableSession)
    private readonly tableSessionRepository: Repository<TableSession>
  ) {
    super();
  }

  async validate(req: Request): Promise<any> {
    // Check for session cookie first (returning customer)
    const sessionToken = req.cookies?.session;
    if (sessionToken) {
      const session = await this.validateSession(sessionToken);
      if (session) {
        return {
          type: 'table_session',
          tableId: session.tableId,
          table: session.table,
          sessionId: session.id,
          restaurantId: session.table?.restaurantId
        };
      }
    }

    // Check for table token in query/body (new customer)
    const tableToken = req.query.tableToken || req.body?.tableToken;
    if (tableToken) {
      const tableTokenEntity = await this.validateTableToken(tableToken as string);
      if (tableTokenEntity) {
        return {
          type: 'table_token',
          tableId: tableTokenEntity.tableId,
          table: tableTokenEntity.table,
          restaurantId: tableTokenEntity.table?.restaurantId
        };
      }
    }

    throw new UnauthorizedException('Acesso à mesa não autorizado');
  }

  private async validateSession(token: string): Promise<TableSession | null> {
    const session = await this.tableSessionRepository.findOne({
      where: { token, isActive: true },
      relations: ['table', 'table.restaurant']
    });

    if (!session) return null;
    if (session.expiresAt < new Date()) return null;

    return session;
  }

  private async validateTableToken(token: string): Promise<TableToken | null> {
    const tableToken = await this.tableTokenRepository.findOne({
      where: { token, isActive: true },
      relations: ['table', 'table.restaurant']
    });

    if (!tableToken) return null;
    if (!tableToken.table || tableToken.table.status !== 'free') return null;

    return tableToken;
  }
}