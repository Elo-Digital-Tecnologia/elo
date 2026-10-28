import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@elo/core';
import { CurrentUser, Roles, TenantId } from '../common/decorators';
import type { JwtUser } from '../common/auth-types';
import { BillsService } from './bills.service';
import { AdjustmentDto, WaiveFeeDto } from './bills.dto';

/** Caixa: garçom, caixa e administrador veem e ajustam a conta das mesas. */
@ApiTags('bills')
@ApiBearerAuth()
@Roles(Role.Cashier, Role.Waiter, Role.RestaurantAdmin)
@Controller('bills')
export class BillsController {
  constructor(private readonly bills: BillsService) {}

  @Get()
  list(@TenantId() rid: string) {
    return this.bills.list(rid);
  }

  /** Recalcula a partir dos pedidos atuais da mesa (o valor nunca fica congelado). */
  @Get(':tableId')
  view(@TenantId() rid: string, @Param('tableId', ParseUUIDPipe) tableId: string) {
    return this.bills.view(rid, tableId);
  }

  @Put(':tableId/fee')
  waive(@TenantId() rid: string, @Param('tableId', ParseUUIDPipe) tableId: string, @Body() dto: WaiveFeeDto) {
    return this.bills.setFeeWaived(rid, tableId, dto.waived);
  }

  @Post(':tableId/adjustments')
  addAdjustment(
    @TenantId() rid: string,
    @CurrentUser() user: JwtUser,
    @Param('tableId', ParseUUIDPipe) tableId: string,
    @Body() dto: AdjustmentDto,
  ) {
    return this.bills.addAdjustment(rid, tableId, dto, user.sub);
  }

  @Delete(':tableId/adjustments/:index')
  removeAdjustment(
    @TenantId() rid: string,
    @Param('tableId', ParseUUIDPipe) tableId: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.bills.removeAdjustment(rid, tableId, index);
  }
}
