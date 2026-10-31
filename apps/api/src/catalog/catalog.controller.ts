import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantManagerRoles, Role } from '@elo/core';
import { Roles, TenantId } from '../common/decorators';
import { CatalogService } from './catalog.service';
import { AvailabilityDto, CategoryDto, OrderIdsDto, ProductDto, ProductOrderDto } from './catalog.dto';

@ApiTags('catalog')
@ApiBearerAuth()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Roles(Role.RestaurantAdmin, Role.Manager, Role.Waiter, Role.Cashier, Role.Kitchen)
  @Get()
  menu(@TenantId() rid: string) {
    return this.catalog.fullMenu(rid);
  }

  @Roles(...RestaurantManagerRoles)
  @Post('categories')
  createCategory(@TenantId() rid: string, @Body() dto: CategoryDto) {
    return this.catalog.createCategory(rid, dto);
  }

  @Roles(...RestaurantManagerRoles)
  @HttpCode(204)
  @Patch('categories/order')
  orderCategories(@TenantId() rid: string, @Body() dto: OrderIdsDto) {
    return this.catalog.orderCategories(rid, dto.ids);
  }

  @Roles(...RestaurantManagerRoles)
  @HttpCode(204)
  @Patch('products/order')
  orderProducts(@TenantId() rid: string, @Body() dto: ProductOrderDto) {
    return this.catalog.orderProducts(rid, dto.categoryId, dto.ids);
  }

  @Roles(...RestaurantManagerRoles)
  @Put('categories/:id')
  updateCategory(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CategoryDto) {
    return this.catalog.updateCategory(rid, id, dto);
  }

  @Roles(...RestaurantManagerRoles)
  @HttpCode(204)
  @Delete('categories/:id')
  removeCategory(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.removeCategory(rid, id);
  }

  @Roles(...RestaurantManagerRoles)
  @Post('products')
  createProduct(@TenantId() rid: string, @Body() dto: ProductDto) {
    return this.catalog.createProduct(rid, dto);
  }

  @Roles(...RestaurantManagerRoles)
  @Put('products/:id')
  updateProduct(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ProductDto) {
    return this.catalog.updateProduct(rid, id, dto);
  }

  @Roles(...RestaurantManagerRoles)
  @Patch('products/:id/availability')
  availability(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AvailabilityDto) {
    return this.catalog.setAvailability(rid, id, dto.available);
  }

  @Roles(...RestaurantManagerRoles)
  @HttpCode(204)
  @Delete('products/:id')
  removeProduct(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.removeProduct(rid, id);
  }
}
