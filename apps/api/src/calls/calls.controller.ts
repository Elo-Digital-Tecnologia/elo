import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@elo/core';
import { Roles, TenantId } from '../common/decorators';
import { CallsService } from './calls.service';

@ApiTags('calls')
@ApiBearerAuth()
@Roles(Role.Waiter, Role.RestaurantAdmin)
@Controller('calls')
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  @Get()
  pending(@TenantId() rid: string) {
    return this.calls.pending(rid);
  }

  @Post(':id/resolve')
  resolve(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.calls.resolve(rid, id);
  }
}
