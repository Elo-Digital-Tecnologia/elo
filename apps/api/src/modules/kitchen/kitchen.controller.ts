// Kitchen Controller — Elo Digital API

import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { KitchenService } from './kitchen.service';
import { JwtAuthGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, CurrentRestaurant } from '../../common/decorators';

@ApiTags('kitchen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar pedidos da cozinha' })
  async getKitchenOrders(@CurrentRestaurant() restaurantId: string) {
    return this.kitchenService.getKitchenOrders(restaurantId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter pedido da cozinha' })
  async getOrder(@CurrentRestaurant() restaurantId: string, @Param('id') id: string) {
    return this.kitchenService.getOrder(restaurantId, id);
  }

  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar status do pedido' })
  async updateOrderStatus(
    @CurrentRestaurant() restaurantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body('status') status: string
  ) {
    return this.kitchenService.updateOrderStatus(restaurantId, id, status as any, userId);
  }

  @Put(':id/items/:itemId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar status do item' })
  async updateItemStatus(
    @CurrentRestaurant() restaurantId: string,
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @CurrentUser('sub') userId: string,
    @Body('status') status: string
  ) {
    return this.kitchenService.updateItemStatus(restaurantId, orderId, itemId, status as any, userId);
  }
}