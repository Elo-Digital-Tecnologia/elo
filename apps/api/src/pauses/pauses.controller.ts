import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantManagerRoles } from '@elo/core';
import { CurrentUser, Roles, TenantId } from '../common/decorators';
import type { JwtUser } from '../common/auth-types';
import { CreatePauseDto, PauseListQuery } from './pauses.dto';
import { PausesService } from './pauses.service';

@ApiTags('pauses')
@ApiBearerAuth()
@Roles(...RestaurantManagerRoles)
@Controller('restaurant/pauses')
export class PausesController {
  constructor(private readonly pauses: PausesService) {}

  @Get()
  list(@TenantId() restaurantId: string, @Query() q: PauseListQuery) {
    return this.pauses.list(restaurantId, q.page);
  }

  @Post()
  create(@TenantId() restaurantId: string, @Body() dto: CreatePauseDto, @CurrentUser() actor: JwtUser) {
    return this.pauses.create(restaurantId, dto, actor);
  }

  @HttpCode(204)
  @Post(':id/end')
  end(@TenantId() restaurantId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtUser) {
    return this.pauses.end(restaurantId, id, actor);
  }
}
