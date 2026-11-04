import type { JwtUser } from '#/common/types/jwt-user.type.js';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    StreamableFile
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantManagerRoles, Role, hasAnyRole } from '@elo/core/roles/roles';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { TenantId } from '#/common/decorators/tenant-id.decorator.js';
import { CreateTableDTO } from './dto/create-table.dto.js';
import { DiningTableResponseDTO } from './dto/dining-table-response.dto.js';
import { TableResponseDTO } from './dto/table-response.dto.js';
import { TableService } from './table.service.js';

@ApiTags('tables')
@ApiBearerAuth()
@Controller('tables')
export class TableController {
    constructor(private readonly tables: TableService) {}

    @Roles(Role.RESTAURANT_ADMIN, Role.MANAGER, Role.WAITER, Role.CASHIER, Role.KITCHEN)
    @Get()
    public async list(@TenantId() rid: string, @CurrentUser() user: JwtUser) {
        const rows = await this.tables.withWaiterNames(await this.tables.list(rid));
        const withToken = hasAnyRole(user.roles, RestaurantManagerRoles);
        return rows.map((table) => TableResponseDTO.from(table, { withToken }));
    }

    @Roles(Role.WAITER, Role.RESTAURANT_ADMIN, Role.MANAGER)
    @Get('pending')
    public async pending(@TenantId() rid: string) {
        const rows = await this.tables.withWaiterNames(await this.tables.pending(rid));
        return rows.map((table) => TableResponseDTO.from(table, { withToken: false }));
    }

    @Roles(...RestaurantManagerRoles)
    @Post()
    public async create(
        @TenantId() rid: string,
        @Body() dto: CreateTableDTO,
        @CurrentUser() user: JwtUser
    ) {
        return DiningTableResponseDTO.from(await this.tables.create(rid, dto.name, user));
    }

    @Roles(...RestaurantManagerRoles)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete(':id')
    public remove(
        @TenantId() rid: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtUser
    ) {
        return this.tables.remove(rid, id, user);
    }

    @Roles(...RestaurantManagerRoles)
    @Get(':id/qr')
    public async qr(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string) {
        return new StreamableFile(await this.tables.qrPng(rid, id), {
            type: 'image/png'
        });
    }

    @Roles(Role.WAITER)
    @Post(':id/validate-open')
    public async validateOpen(
        @TenantId() rid: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtUser
    ) {
        return TableResponseDTO.from(await this.tables.validateOpen(rid, id, user), {
            withToken: false
        });
    }

    @Roles(Role.WAITER)
    @Post(':id/reject-open')
    public async rejectOpen(
        @TenantId() rid: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtUser
    ) {
        return TableResponseDTO.from(await this.tables.rejectOpen(rid, id, user), {
            withToken: false
        });
    }

    @Roles(Role.WAITER)
    @Post(':id/close')
    public async close(
        @TenantId() rid: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtUser
    ) {
        return TableResponseDTO.from(await this.tables.close(rid, id, user), {
            withToken: false
        });
    }

    /** Shift change: the waiter becomes responsible for the table. */
    @Roles(Role.WAITER)
    @Post(':id/take')
    public async take(
        @TenantId() rid: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtUser
    ) {
        return TableResponseDTO.from(await this.tables.take(rid, id, user), {
            withToken: false
        });
    }
}
