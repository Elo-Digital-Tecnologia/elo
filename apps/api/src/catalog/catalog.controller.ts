import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@elo/core';
import { Roles, TenantId } from '../common/decorators';
import { CatalogService } from './catalog.service';
import { AvailabilityDto, CategoryDto, ProductDto } from './catalog.dto';

@ApiTags('catalog')
@ApiBearerAuth()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Roles(Role.RestaurantAdmin, Role.Waiter, Role.Cashier, Role.Kitchen)
  @Get()
  menu(@TenantId() rid: string) {
    return this.catalog.fullMenu(rid);
  }

  @Roles(Role.RestaurantAdmin)
  @Post('categories')
  createCategory(@TenantId() rid: string, @Body() dto: CategoryDto) {
    return this.catalog.createCategory(rid, dto);
  }

  @Roles(Role.RestaurantAdmin)
  @Put('categories/:id')
  updateCategory(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CategoryDto) {
    return this.catalog.updateCategory(rid, id, dto);
  }

  @Roles(Role.RestaurantAdmin)
  @HttpCode(204)
  @Delete('categories/:id')
  removeCategory(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.removeCategory(rid, id);
  }

  @Roles(Role.RestaurantAdmin)
  @Post('products')
  createProduct(@TenantId() rid: string, @Body() dto: ProductDto) {
    return this.catalog.createProduct(rid, dto);
  }

  @Roles(Role.RestaurantAdmin)
  @Put('products/:id')
  updateProduct(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ProductDto) {
    return this.catalog.updateProduct(rid, id, dto);
  }

  @Roles(Role.RestaurantAdmin)
  @Patch('products/:id/availability')
  availability(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AvailabilityDto) {
    return this.catalog.setAvailability(rid, id, dto.available);
  }

  @Roles(Role.RestaurantAdmin)
  @HttpCode(204)
  @Delete('products/:id')
  removeProduct(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.removeProduct(rid, id);
  }
}
