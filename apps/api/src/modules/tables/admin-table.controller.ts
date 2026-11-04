import type { JwtUser } from '#/common/types/jwt-user.type.js';
import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@elo/core/roles/permissions';
import { Role } from '@elo/core/roles/roles';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { RequirePermission } from '#/common/decorators/require-permission.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { AdminTableListResponseDTO } from './dto/admin-table-list-response.dto.js';
import { DiningTableResponseDTO } from './dto/dining-table-response.dto.js';
import { TableService } from './table.service.js';

/** Token rotation: Elo team with the specific permission. */
@ApiTags('admin-tables')
@ApiBearerAuth()
@Roles(Role.SUPERADMIN, Role.ELO_ADMIN)
@RequirePermission(Permission.RESTAURANTS_TABLES)
@Controller('admin/restaurants/:restaurantId/tables')
export class AdminTableController {
    constructor(private readonly tables: TableService) {}

    @Get()
    public async list(@Param('restaurantId', ParseUUIDPipe) restaurantId: string) {
        return AdminTableListResponseDTO.from(await this.tables.adminList(restaurantId));
    }

    @Post(':id/rotate-token')
    public async rotate(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtUser
    ) {
        return DiningTableResponseDTO.from(
            await this.tables.rotateToken(restaurantId, id, user)
        );
    }
}
