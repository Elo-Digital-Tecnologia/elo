// Restaurants Controller — Elo Digital API

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

import { RestaurantsService } from './restaurants.service';
import { JwtAuthGuard, RequireRole, RequirePermissions } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

import { CreateRestaurantInput, UpdateRestaurantInput } from '@elo-digital/core/validation';
import { UserRole } from '@elo-digital/core/types';

@ApiTags('restaurants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @RequireRole('admin_elo')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo restaurante (admin Elo Digital)' })
  @ApiResponse({ status: 201, description: 'Restaurante criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Slug já em uso' })
  async create(@Body() input: CreateRestaurantInput, @CurrentUser() user: any) {
    return this.restaurantsService.create(input, user);
  }

  @Get()
  @RequirePermissions('restaurant:read')
  @ApiOperation({ summary: 'Listar restaurantes com paginação' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean
  ) {
    return this.restaurantsService.findAll(page, pageSize, { search, isActive });
  }

  @Get('stats')
  @RequirePermissions('restaurant:read')
  @ApiOperation({ summary: 'Obter estatísticas gerais dos restaurantes' })
  async getGlobalStats() {
    // In a real app, this would return aggregated stats
    return {
      total: 0,
      active: 0,
      suspended: 0,
      trialing: 0,
      totalRevenue: 0
    };
  }

  @Get(':id')
  @RequirePermissions('restaurant:read')
  @ApiOperation({ summary: 'Obter restaurante por ID' })
  @ApiResponse({ status: 404, description: 'Restaurante não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Obter restaurante por slug (público)' })
  @ApiResponse({ status: 404, description: 'Restaurante não encontrado' })
  async findBySlug(@Param('slug') slug: string) {
    return this.restaurantsService.findBySlug(slug);
  }

  @Put(':id')
  @RequirePermissions('restaurant:update')
  @ApiOperation({ summary: 'Atualizar restaurante' })
  @ApiResponse({ status: 404, description: 'Restaurante não encontrado' })
  @ApiResponse({ status: 409, description: 'Slug já em uso' })
  async update(@Param('id') id: string, @Body() input: UpdateRestaurantInput) {
    return this.restaurantsService.update(id, input);
  }

  @Put(':id/settings')
  @RequireRole('admin_restaurant')
  @ApiOperation({ summary: 'Atualizar configurações do restaurante' })
  async updateSettings(@Param('id') id: string, @Body() settings: any) {
    return this.restaurantsService.updateSettings(id, settings);
  }

  @Put(':id/suspend')
  @RequireRole('admin_elo')
  @ApiOperation({ summary: 'Suspender restaurante' })
  async suspend(@Param('id') id: string) {
    return this.restaurantsService.suspend(id);
  }

  @Put(':id/reactivate')
  @RequireRole('admin_elo')
  @ApiOperation({ summary: 'Reativar restaurante' })
  async reactivate(@Param('id') id: string) {
    return this.restaurantsService.reactivate(id);
  }

  @Delete(':id')
  @RequireRole('admin_elo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir restaurante (admin Elo Digital)' })
  @ApiResponse({ status: 404, description: 'Restaurante não encontrado' })
  async delete(@Param('id') id: string) {
    return this.restaurantsService.delete(id);
  }

  @Get(':id/stats')
  @RequirePermissions('restaurant:read')
  @ApiOperation({ summary: 'Obter estatísticas do restaurante' })
  async getStats(@Param('id') id: string) {
    return this.restaurantsService.getStats(id);
  }
}