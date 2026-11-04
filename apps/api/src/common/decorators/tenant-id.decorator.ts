import type { ExecutionContext } from '@nestjs/common';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import { createParamDecorator } from '@nestjs/common';
import { AccessDeniedException } from '#/common/exceptions/access-denied.exception.js';

/** Restaurant of the signed-in member; refused for the Elo team. */
export const TenantId = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): string => {
        const user: JwtUser = ctx.switchToHttp().getRequest().user;
        if (!user.restaurantId) throw new AccessDeniedException();
        return user.restaurantId;
    }
);
