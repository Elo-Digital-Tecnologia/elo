// Waiter Controller — Elo Digital API

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

import { WaiterService } from './waiter.service';
import { JwtAuthGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, CurrentRestaurant } from '../../common/decorators';

@ApiTags('waiter')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('waiter')
export class WaiterController {
  constructor(private readonly waiterService: WaiterService) {}

  @Post('calls')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar chamado do garçom (público)' })
  async createCall(@Body('tableToken') tableToken: string, @Body('message') message?: string) {
    return this.waiterService.createCall(tableToken, { message });
  }

  @Get('calls')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar chamados pendentes' })
  async getCalls(@CurrentRestaurant() restaurantId: string) {
    return this.waiterService.getCalls(restaurantId);
  }

  @Get('calls/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter chamado' })
  async getCall(@Param('id') id: string) {
    return this.waiterService.getCall(id);
  }

  @Put('calls/:id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Responder chamado' })
  async respondCall(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.waiterService.respondCall(id, userId);
  }

  @Put('calls/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar chamado' })
  async cancelCall(@Param('id') id: string) {
    return this.waiterService.cancelCall(id);
  }

  @Get('validations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter validações de mesa pendentes' })
  async getValidations(@CurrentRestaurant() restaurantId: string) {
    return this.waiterService.getValidations(restaurantId);
  }
}