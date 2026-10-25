// Billing Controller — Elo Digital API

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { BillingService } from './billing.service';
import { JwtAuthGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, CurrentRestaurant } from '../../common/decorators';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('tables/:tableId/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calcular conta da mesa' })
  async calculate(@CurrentRestaurant() restaurantId: string, @Param('tableId') tableId: string) {
    return this.billingService.calculateBill(tableId);
  }

  @Post('from-order/:orderId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar conta a partir do pedido' })
  async createFromOrder(@Param('orderId') orderId: string, @CurrentUser('sub') userId: string) {
    return this.billingService.createBillFromOrder(orderId, userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter conta' })
  async getBill(@CurrentRestaurant() restaurantId: string, @Param('id') id: string) {
    return this.billingService.getBill(restaurantId, id);
  }

  @Get('table/:tableId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter conta da mesa' })
  async getBillByTable(@CurrentRestaurant() restaurantId: string, @Param('tableId') tableId: string) {
    return this.billingService.getBillByTable(restaurantId, tableId);
  }

  @Put(':id/split')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alterar tipo de divisão da conta' })
  async updateSplit(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body('splitType') splitType: string,
    @Body('splitCount') splitCount?: number
  ) {
    return this.billingService.updateSplit(id, splitType, splitCount || 1, userId);
  }

  @Put(':id/service-charge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aplicar/remover taxa de serviço' })
  async toggleServiceCharge(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body('enabled') enabled: boolean
  ) {
    return this.billingService.toggleServiceCharge(id, enabled, userId);
  }

  @Put(':id/discount')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aplicar desconto' })
  async applyDiscount(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body('amount') amount: number
  ) {
    return this.billingService.applyDiscount(id, amount, userId);
  }

  @Put(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fechar conta' })
  async closeBill(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.billingService.closeBill(id, userId);
  }
}