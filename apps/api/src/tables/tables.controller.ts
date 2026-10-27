import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission, Role } from '@elo/core';
import { CurrentUser, RequirePermission, Roles, TenantId } from '../common/decorators';
import type { JwtUser } from '../common/auth-types';
import { TablesService } from './tables.service';
import { CreateTableDto } from './tables.dto';

/** Token completo só é exposto a quem gerencia mesas (QR/link). */
const view = (t: { token: string } & Record<string, unknown>, withToken: boolean) => {
  if (withToken) return t;
  const { token: _token, ...rest } = t;
  return rest;
};

@ApiTags('tables')
@ApiBearerAuth()
@Controller('tables')
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Roles(Role.RestaurantAdmin, Role.Waiter, Role.Cashier, Role.Kitchen)
  @Get()
  async list(@TenantId() rid: string, @CurrentUser() user: JwtUser) {
    const rows = await this.tables.list(rid);
    return rows.map((t) => view(t as never, user.role === Role.RestaurantAdmin));
  }

  @Roles(Role.Waiter, Role.RestaurantAdmin)
  @Get('pending')
  async pending(@TenantId() rid: string) {
    return (await this.tables.pending(rid)).map((t) => view(t as never, false));
  }

  @Roles(Role.RestaurantAdmin)
  @Post()
  create(@TenantId() rid: string, @Body() dto: CreateTableDto) {
    return this.tables.create(rid, dto.name);
  }

  @Roles(Role.RestaurantAdmin)
  @HttpCode(204)
  @Delete(':id')
  remove(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.tables.remove(rid, id);
  }

  @Roles(Role.RestaurantAdmin)
  @Get(':id/qr')
  async qr(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string) {
    return new StreamableFile(await this.tables.qrPng(rid, id), { type: 'image/png' });
  }

  @Roles(Role.Waiter)
  @Post(':id/validate-open')
  async validateOpen(
    @TenantId() rid: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return view((await this.tables.validateOpen(rid, id, user.sub)) as never, false);
  }

  @Roles(Role.Waiter)
  @Post(':id/reject-open')
  async rejectOpen(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string) {
    return view((await this.tables.rejectOpen(rid, id)) as never, false);
  }

  @Roles(Role.Waiter)
  @Post(':id/close')
  async close(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string) {
    return view((await this.tables.close(rid, id)) as never, false);
  }
}

/** Regravação de token: equipe Elo com permissão específica. */
@ApiTags('admin-tables')
@ApiBearerAuth()
@Roles(Role.Superadmin, Role.EloAdmin)
@RequirePermission(Permission.TableTokens)
@Controller('admin/restaurants/:restaurantId/tables')
export class AdminTablesController {
  constructor(private readonly tables: TablesService) {}

  @Post(':id/rotate-token')
  rotate(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tables.rotateToken(restaurantId, id);
  }
}
