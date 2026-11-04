import type { ExecutionContext } from '@nestjs/common';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import { createParamDecorator } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): JwtUser => ctx.switchToHttp().getRequest().user
);
