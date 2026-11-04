import type { ExecutionContext } from '@nestjs/common';
import type { SessionContext } from '#/modules/tables/table.service.js';
import { createParamDecorator } from '@nestjs/common';

export const CurrentTableSession = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): SessionContext =>
        ctx.switchToHttp().getRequest().tableCtx
);
