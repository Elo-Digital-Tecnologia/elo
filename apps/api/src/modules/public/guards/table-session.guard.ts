import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TABLE_SESSION_COOKIE_NAME } from '#/common/constants.js';
import { TableService } from '#/modules/tables/table.service.js';

/** Authenticates the guest by the table session (cookie). Independent from the staff JWT. */
@Injectable()
export class TableSessionGuard implements CanActivate {
    constructor(private readonly tables: TableService) {}

    public async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest();
        req.tableCtx = await this.tables.resolveSession(
            req.cookies?.[TABLE_SESSION_COOKIE_NAME]
        );
        return true;
    }
}
