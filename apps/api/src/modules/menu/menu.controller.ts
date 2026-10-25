// Menu Controller — Elo Digital API

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

import { MenuService } from './menu.service';
import { JwtAuthGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, CurrentRestaurant } from '../../common/decorators';

@ApiTags('menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // Categories
  @Post('categories')
  @RequirePermissions('menu:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar categoria' })
  async createCategory(@CurrentRestaurant() restaurantId: string, @Body() input: any) {
    return this.menuService.createCategory(restaurantId, input);
  }

  @Get('categories')
  @RequirePermissions('menu:read')
  @ApiOperation({ summary: 'Listar categorias' })
  async getCategories(@CurrentRestaurant() restaurantId: string) {
    return this.menuService.getCategories(restaurantId);
  }

  @Get('categories/:id')
  @RequirePermissions('menu:read')
  @ApiOperation({ summary: 'Obter categoria' })
  async getCategory(@CurrentRestaurant() restaurantId: string, @Param('id') id: string) {
    return this.menuService.getCategory(restaurantId, id);
  }

  @Put('categories/:id')
  @RequirePermissions('menu:update')
  @ApiOperation({ summary: 'Atualizar categoria' })
  async updateCategory(@CurrentRestaurant() restaurantId: string, @Param('id') id: string, @Body() input: any) {
    return this.menuService.updateCategory(restaurantId, id, input);
  }

  @Delete('categories/:id')
  @RequirePermissions('menu:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir categoria' })
  async deleteCategory(@CurrentRestaurant() restaurantId: string, @Param('id') id: string) {
    return this.menuService.deleteCategory(restaurantId, id);
  }

  // Products
  @Post('products')
  @RequirePermissions('menu:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar produto' })
  async createProduct(@CurrentRestaurant() restaurantId: string, @Body() input: any) {
    return this.menuService.createProduct(restaurantId, input);
  }

  @Get('products')
  @RequirePermissions('menu:read')
  @ApiOperation({ summary: 'Listar produtos' })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  async getProducts(
    @CurrentRestaurant() restaurantId: string,
    @Query('categoryId') categoryId?: string
  ) {
    return this.menuService.getProducts(restaurantId, categoryId);
  }

  @Get('products/:id')
  @RequirePermissions('menu:read')
  @ApiOperation({ summary: 'Obter produto' })
  async getProduct(@CurrentRestaurant() restaurantId: string, @Param('id') id: string) {
    return this.menuService.getProduct(restaurantId, id);
  }

  @Put('products/:id')
  @RequirePermissions('menu:update')
  @ApiOperation({ summary: 'Atualizar produto' })
  async updateProduct(@CurrentRestaurant() restaurantId: string, @Param('id') id: string, @Body() input: any) {
    return this.menuService.updateProduct(restaurantId, id, input);
  }

  @Put('products/:id/availability')
  @RequirePermissions('menu:manage_availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alternar disponibilidade do produto' })
  async toggleAvailability(
    @CurrentRestaurant() restaurantId: string,
    @Param('id') id: string,
    @Body('available') available: boolean
  ) {
    return this.menuService.toggleAvailability(restaurantId, id, available);
  }

  @Delete('products/:id')
  @RequirePermissions('menu:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir produto' })
  async deleteProduct(@CurrentRestaurant() restaurantId: string, @Param('id') id: string) {
    return this.menuService.deleteProduct(restaurantId, id);
  }

  // Options
  @Post('products/:productId/options')
  @RequirePermissions('menu:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar opção de produto' })
  async createOption(@Param('productId') productId: string, @Body() input: any) {
    return this.menuService.createOption(productId, input);
  }

  @Get('products/:productId/options')
  @RequirePermissions('menu:read')
  @ApiOperation({ summary: 'Listar opções do produto' })
  async getOptions(@Param('productId') productId: string) {
    return this.menuService.getOptions(productId);
  }

  @Put('options/:id')
  @RequirePermissions('menu:update')
  @ApiOperation({ summary: 'Atualizar opção' })
  async updateOption(@Param('id') id: string, @Body() input: any) {
    return this.menuService.updateOption(id, input);
  }

  @Delete('options/:id')
  @RequirePermissions('menu:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir opção' })
  async deleteOption(@Param('id') id: string) {
    return this.menuService.deleteOption(id);
  }

  // Choices
  @Post('options/:optionId/choices')
  @RequirePermissions('menu:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar escolha de opção' })
  async createChoice(@Param('optionId') optionId: string, @Body() input: any) {
    return this.menuService.createChoice(optionId, input);
  }

  @Put('choices/:id')
  @RequirePermissions('menu:update')
  @ApiOperation({ summary: 'Atualizar escolha' })
  async updateChoice(@Param('id') id: string, @Body() input: any) {
    return this.menuService.updateChoice(id, input);
  }

  @Delete('choices/:id')
  @RequirePermissions('menu:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir escolha' })
  async deleteChoice(@Param('id') id: string) {
    return this.menuService.deleteChoice(id);
  }
}