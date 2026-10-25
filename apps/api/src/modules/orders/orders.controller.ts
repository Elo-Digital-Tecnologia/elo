// Orders Controller — Elo Digital API

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { OrdersService } from './orders.service';
import { JwtAuthGuard, RequirePermissions, RequireAnyPermission } from '../../common/guards';
import { CurrentUser, CurrentRestaurant } from '../../common/decorators';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('from-session/:sessionId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar pedido a partir de sessão de mesa (público)' })
  async createFromSession(@Param('sessionId') sessionId: string, @Body() input: any) {
    return this.ordersService.createFromSession(sessionId, input);
  }

  @Post(':id/validate')
  @RequirePermissions('order:manage_status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar abertura de mesa (garçom)' })
  async validateOpen(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body('action') action: 'approve' | 'reject',
    @Body('reason') reason?: string
  ) {
    return this.ordersService.validateOpen(id, userId, action, reason);
  }

  @Get()
  @RequirePermissions('order:read')
  @ApiOperation({ summary: 'Listar pedidos do restaurante' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'tableId', required: false, type: String })
  async getOrders(
    @CurrentRestaurant() restaurantId: string,
    @Query('status') status?: string,
    @Query('tableId') tableId?: string
  ) {
    return this.ordersService.getOrders(restaurantId, { status, tableId });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter pedido' })
  async getOrder(@Param('id') id: string) {
    return this.ordersService.getOrder(id);
  }

  @Put(':id/status')
  @RequireAnyPermission('order:manage_status', 'kitchen:update_status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar status do pedido' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body('status') status: string,
    @Body('itemId') itemId?: string
  ) {
    return this.ordersService.updateStatus(id, status as any, userId, itemId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar pedido' })
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('reason') reason: string
  ) {
    return this.ordersService.cancelOrder(id, user.sub, reason, user.role);
  }
}