import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@elo/core/roles/permissions';
import { RestaurantManagerRoles, Role } from '@elo/core/roles/roles';
import { AllowSuspended } from '#/common/decorators/allow-suspended.decorator.js';
import { RequirePermission } from '#/common/decorators/require-permission.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { TenantId } from '#/common/decorators/tenant-id.decorator.js';
import { AuditLogService } from './audit-log.service.js';
import { AuditLogPageResponseDTO } from './dto/audit-log-page-response.dto.js';
import { FindAuditLogsQueryDTO } from './dto/find-audit-logs-query.dto.js';

@ApiTags('activity')
@ApiBearerAuth()
@Controller()
export class AuditLogController {
    constructor(private readonly audit: AuditLogService) {}

    /** The restaurant's own log: what its team and the Elo team did there. */
    @AllowSuspended()
    @Roles(...RestaurantManagerRoles)
    @Get('restaurant/activity')
    public async mine(@TenantId() rid: string, @Query() q: FindAuditLogsQueryDTO) {
        return AuditLogPageResponseDTO.from(await this.audit.list(rid, q));
    }

    @Roles(Role.SUPERADMIN, Role.ELO_ADMIN)
    @RequirePermission(Permission.RESTAURANTS_ACTIVITY)
    @Get('admin/restaurants/:id/activity')
    public async of(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() q: FindAuditLogsQueryDTO
    ) {
        return AuditLogPageResponseDTO.from(await this.audit.list(id, q));
    }
}
