import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@elo/core';
import { CurrentUser, NoImpersonation, Roles, TenantId } from '../common/decorators';
import type { JwtUser } from '../common/auth-types';
import { CallsService } from './calls.service';

@ApiTags('calls')
@ApiBearerAuth()
@Roles(Role.Waiter, Role.RestaurantAdmin, Role.Manager)
@Controller('calls')
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  @Get()
  pending(@TenantId() rid: string) {
    return this.calls.pending(rid);
  }

  /** Answering a call is the waiters' job; Elo support only watches the floor. */
  @Roles(Role.Waiter)
  @NoImpersonation()
  @Post(':id/resolve')
  resolve(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.calls.resolve(rid, id, user);
  }
}
