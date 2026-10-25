// Tables Controller — Elo Digital API

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { TablesService } from './tables.service';
import { JwtAuthGuard, RequirePermissions } from '../../common/guards';
import { CurrentRestaurant } from '../../common/decorators';

@ApiTags('tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @RequirePermissions('tables:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar mesa' })
  async create(@CurrentRestaurant() restaurantId: string, @Body() input: any) {
    return this.tablesService.create(restaurantId, input);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar mesas' })
  async getAll(@CurrentRestaurant() restaurantId: string) {
    return this.tablesService.getAll(restaurantId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter mesa' })
  async getOne(@CurrentRestaurant() restaurantId: string, @Param('id') id: string) {
    return this.tablesService.getOne(restaurantId, id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar mesa' })
  async update(@CurrentRestaurant() restaurantId: string, @Param('id') id: string, @Body() input: any) {
    return this.tablesService.update(restaurantId, id, input);
  }

  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar status da mesa' })
  async updateStatus(
    @CurrentRestaurant() restaurantId: string,
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    return this.tablesService.updateStatus(restaurantId, id, status as any);
  }

  @Post(':id/regenerate-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerar token da mesa' })
  async regenerateToken(@CurrentRestaurant() restaurantId: string, @Param('id') id: string) {
    return this.tablesService.regenerateToken(restaurantId, id);
  }

  @Get(':id/qrcode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter QR Code da mesa' })
  async getQRCode(@CurrentRestaurant() restaurantId: string, @Param('id') id: string) {
    return this.tablesService.getQRCode(restaurantId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir mesa' })
  async delete(@CurrentRestaurant() restaurantId: string, @Param('id') id: string) {
    return this.tablesService.delete(restaurantId, id);
  }
}