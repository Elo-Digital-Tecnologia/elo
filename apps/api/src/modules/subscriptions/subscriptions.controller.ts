// Subscriptions Controller — Elo Digital API

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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard, RequirePermissions, RequireRole } from '../../common/guards';
import { CurrentUser, CurrentRestaurant } from '../../common/decorators';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @RequireRole('admin_elo')
  @ApiOperation({ summary: 'Listar todas as assinaturas (admin Elo Digital)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('status') status?: string
  ) {
    return this.subscriptionsService.getAll(page, pageSize, { status });
  }

  @Get('restaurant/:restaurantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter assinatura do restaurante' })
  async getByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.subscriptionsService.getByRestaurant(restaurantId);
  }

  @Get(':id')
  @RequireRole('admin_elo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter assinatura por ID' })
  async getOne(@Param('id') id: string) {
    return this.subscriptionsService.getOne(id);
  }

  @Post()
  @RequireRole('admin_elo')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar assinatura (admin Elo Digital)' })
  async create(@Body() input: any) {
    return this.subscriptionsService.create(input);
  }

  @Put(':id')
  @RequireRole('admin_elo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar assinatura' })
  async update(@Param('id') id: string, @Body() input: any) {
    return this.subscriptionsService.update(id, input);
  }

  @Put(':id/suspend')
  @RequireRole('admin_elo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspender assinatura' })
  async suspend(@Param('id') id: string) {
    return this.subscriptionsService.suspend(id);
  }

  @Put(':id/reactivate')
  @RequireRole('admin_elo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reativar assinatura' })
  async reactivate(@Param('id') id: string) {
    return this.subscriptionsService.reactivate(id);
  }

  @Post(':id/payments')
  @RequireRole('admin_elo')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar pagamento de assinatura' })
  async recordPayment(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() input: any
  ) {
    return this.subscriptionsService.recordPayment(id, input, userId);
  }

  @Get(':id/payments')
  @RequireRole('admin_elo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar pagamentos da assinatura' })
  async getPayments(@Param('id') id: string) {
    return this.subscriptionsService.getPayments(id);
  }
}