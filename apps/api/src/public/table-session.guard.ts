import { CanActivate, createParamDecorator, ExecutionContext, Injectable } from '@nestjs/common';
import { SessionContext, TablesService } from '../tables/tables.service';
import { TABLE_COOKIE } from '../realtime/realtime.gateway';

/** Autentica o cliente pela sessão da mesa (cookie). Independente do JWT dos funcionários. */
@Injectable()
export class TableSessionGuard implements CanActivate {
  constructor(private readonly tables: TablesService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    req.tableCtx = await this.tables.resolveSession(req.cookies?.[TABLE_COOKIE]);
    return true;
  }
}

export const Session = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SessionContext => ctx.switchToHttp().getRequest().tableCtx,
);
