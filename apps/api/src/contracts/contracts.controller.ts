import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission, Role } from '@elo/core';
import type { JwtUser } from '../common/auth-types';
import { CurrentUser, RequirePermission, Roles } from '../common/decorators';
import { ContractDto, ReasonDto } from './contracts.dto';
import { ContractsService } from './contracts.service';

@ApiTags('contracts')
@ApiBearerAuth()
@Roles(Role.Superadmin, Role.EloAdmin)
@Controller('admin/restaurants/:id')
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @RequirePermission(Permission.RestaurantsView)
  @Get('contracts')
  list(@Param('id', ParseUUIDPipe) id: string) {
    return this.contracts.list(id);
  }

  @RequirePermission(Permission.ContractsManage)
  @Post('contracts')
  register(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ContractDto, @CurrentUser() user: JwtUser) {
    return this.contracts.register(id, dto, user);
  }

  /** Voids the latest contract, registered by mistake; it stays in the history. */
  @RequirePermission(Permission.ContractsManage)
  @Post('contracts/:contractId/void')
  void(@Param('id', ParseUUIDPipe) id: string, @Param('contractId', ParseUUIDPipe) contractId: string, @Body() dto: ReasonDto, @CurrentUser() user: JwtUser) {
    return this.contracts.void(id, contractId, dto.reason, user);
  }

  /** Ends the pilot's free trial today (billing starts, with the grace days). */
  @RequirePermission(Permission.PaymentsRecord)
  @HttpCode(204)
  @Post('trial/end')
  endTrial(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto, @CurrentUser() user: JwtUser) {
    return this.contracts.endTrial(id, dto.reason, user);
  }
}
