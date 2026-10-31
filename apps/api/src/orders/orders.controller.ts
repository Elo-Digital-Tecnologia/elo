import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@elo/core';
import { CurrentUser, NoImpersonation, Roles, TenantId } from '../common/decorators';
import type { JwtUser } from '../common/auth-types';
import { OrdersService } from './orders.service';
import { AdvanceOrderDto, CancelStaffDto, ListOrdersQuery } from './orders.dto';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Roles(Role.Kitchen, Role.Waiter, Role.Cashier, Role.RestaurantAdmin, Role.Manager)
  @Get()
  list(@TenantId() rid: string, @Query() query: ListOrdersQuery) {
    return this.orders.list(rid, query);
  }

  /** Quem muda o status é a cozinha. */
  @Roles(Role.Kitchen)
  @Patch(':id/status')
  advance(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AdvanceOrderDto) {
    return this.orders.advance(rid, id, dto.status);
  }

  /** Like moving forward, only the kitchen steps an order back. */
  @Roles(Role.Kitchen)
  @Patch(':id/revert')
  revert(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.revert(rid, id);
  }

  @Roles(Role.Waiter, Role.RestaurantAdmin, Role.Manager)
  @NoImpersonation()
  @Post(':id/cancel')
  cancel(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelStaffDto) {
    return this.orders.cancelByStaff(user, id, dto.reason);
  }

  /** Devolução de pedido já "pronto" (status separado, com motivo). */
  @Roles(Role.Waiter, Role.RestaurantAdmin, Role.Manager)
  @NoImpersonation()
  @Post(':id/return')
  returnOrder(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelStaffDto) {
    return this.orders.returnByStaff(user, id, dto.reason);
  }
}
