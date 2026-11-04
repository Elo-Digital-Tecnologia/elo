import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Put
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantManagerRoles, Role } from '@elo/core/roles/roles';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { TenantId } from '#/common/decorators/tenant-id.decorator.js';
import { CatalogService } from './catalog.service.js';
import { AvailabilityDTO } from './dto/availability.dto.js';
import { CategoryResponseDTO } from './dto/category-response.dto.js';
import { CategoryDTO } from './dto/category.dto.js';
import { MenuCategoryResponseDTO } from './dto/menu-category-response.dto.js';
import { OrderIdsDTO } from './dto/order-ids.dto.js';
import { ProductOrderDTO } from './dto/product-order.dto.js';
import { ProductResponseDTO } from './dto/product-response.dto.js';
import { ProductDTO } from './dto/product.dto.js';

@ApiTags('catalog')
@ApiBearerAuth()
@Controller('catalog')
export class CatalogController {
    constructor(private readonly catalog: CatalogService) {}

    @Roles(Role.RESTAURANT_ADMIN, Role.MANAGER, Role.WAITER, Role.CASHIER, Role.KITCHEN)
    @Get()
    public async menu(@TenantId() rid: string) {
        return (await this.catalog.fullMenu(rid)).map((item) =>
            MenuCategoryResponseDTO.from(item)
        );
    }

    @Roles(...RestaurantManagerRoles)
    @Post('categories')
    public async createCategory(@TenantId() rid: string, @Body() dto: CategoryDTO) {
        return CategoryResponseDTO.from(await this.catalog.createCategory(rid, dto));
    }

    @Roles(...RestaurantManagerRoles)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Patch('categories/order')
    public orderCategories(@TenantId() rid: string, @Body() dto: OrderIdsDTO) {
        return this.catalog.orderCategories(rid, dto.ids);
    }

    @Roles(...RestaurantManagerRoles)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Patch('products/order')
    public orderProducts(@TenantId() rid: string, @Body() dto: ProductOrderDTO) {
        return this.catalog.orderProducts(rid, dto.categoryId, dto.ids);
    }

    @Roles(...RestaurantManagerRoles)
    @Put('categories/:id')
    public async updateCategory(
        @TenantId() rid: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CategoryDTO
    ) {
        return CategoryResponseDTO.from(await this.catalog.updateCategory(rid, id, dto));
    }

    @Roles(...RestaurantManagerRoles)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('categories/:id')
    public removeCategory(
        @TenantId() rid: string,
        @Param('id', ParseUUIDPipe) id: string
    ) {
        return this.catalog.removeCategory(rid, id);
    }

    @Roles(...RestaurantManagerRoles)
    @Post('products')
    public async createProduct(@TenantId() rid: string, @Body() dto: ProductDTO) {
        return ProductResponseDTO.from(await this.catalog.createProduct(rid, dto));
    }

    @Roles(...RestaurantManagerRoles)
    @Put('products/:id')
    public async updateProduct(
        @TenantId() rid: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ProductDTO
    ) {
        return ProductResponseDTO.from(await this.catalog.updateProduct(rid, id, dto));
    }

    @Roles(...RestaurantManagerRoles)
    @Patch('products/:id/availability')
    public async availability(
        @TenantId() rid: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AvailabilityDTO
    ) {
        return ProductResponseDTO.from(
            await this.catalog.setAvailability(rid, id, dto.available)
        );
    }

    @Roles(...RestaurantManagerRoles)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('products/:id')
    public removeProduct(
        @TenantId() rid: string,
        @Param('id', ParseUUIDPipe) id: string
    ) {
        return this.catalog.removeProduct(rid, id);
    }
}
