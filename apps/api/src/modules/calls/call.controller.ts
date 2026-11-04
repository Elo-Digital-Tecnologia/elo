import type { JwtUser } from '#/common/types/jwt-user.type.js';
import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@elo/core/roles/roles';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { NoImpersonation } from '#/common/decorators/no-impersonation.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { TenantId } from '#/common/decorators/tenant-id.decorator.js';
import { CallService } from './call.service.js';
import { PendingCallResponseDTO } from './dto/pending-call-response.dto.js';
import { WaiterCallResponseDTO } from './dto/waiter-call-response.dto.js';

@ApiTags('calls')
@ApiBearerAuth()
@Roles(Role.WAITER, Role.RESTAURANT_ADMIN, Role.MANAGER)
@Controller('calls')
export class CallController {
    constructor(private readonly calls: CallService) {}

    @Get()
    public async pending(@TenantId() rid: string) {
        return (await this.calls.pending(rid)).map((item) =>
            PendingCallResponseDTO.from(item)
        );
    }

    /** Answering a call is the waiters' job; Elo support only watches the floor. */
    @Roles(Role.WAITER)
    @NoImpersonation()
    @Post(':id/resolve')
    public async resolve(
        @TenantId() rid: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtUser
    ) {
        return WaiterCallResponseDTO.from(await this.calls.resolve(rid, id, user));
    }
}
