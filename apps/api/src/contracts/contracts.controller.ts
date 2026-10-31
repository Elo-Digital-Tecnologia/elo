import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission, Role } from '@elo/core';
import type { JwtUser } from '../common/auth-types';
import { CurrentUser, RequirePermission, Roles } from '../common/decorators';
import { ContractDto } from './contracts.dto';
import { ContractsService } from './contracts.service';

@ApiTags('contracts')
@ApiBearerAuth()
@Roles(Role.Superadmin, Role.EloAdmin)
@Controller('admin/restaurants/:id/contracts')
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @RequirePermission(Permission.RestaurantsView)
  @Get()
  list(@Param('id', ParseUUIDPipe) id: string) {
    return this.contracts.list(id);
  }

  @RequirePermission(Permission.ContractsManage)
  @Post()
  register(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ContractDto, @CurrentUser() user: JwtUser) {
    return this.contracts.register(id, dto, user);
  }
}
