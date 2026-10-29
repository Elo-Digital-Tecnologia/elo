import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { ACTIVITY_CATEGORIES, type ActivityCategory, Permission, Role } from '@elo/core';
import { AllowSuspended, RequirePermission, Roles, TenantId } from '../common/decorators';
import { AuditService } from './audit.service';

class ActivityQuery {
  @IsOptional() @IsIn(Object.keys(ACTIVITY_CATEGORIES)) category?: ActivityCategory;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
}

@ApiTags('activity')
@ApiBearerAuth()
@Controller()
export class ActivityController {
  constructor(private readonly audit: AuditService) {}

  /** The restaurant's own log: what its team and the Elo team did there. */
  @AllowSuspended()
  @Roles(Role.RestaurantAdmin)
  @Get('restaurant/activity')
  mine(@TenantId() rid: string, @Query() q: ActivityQuery) {
    return this.audit.list(rid, q);
  }

  @Roles(Role.Superadmin, Role.EloAdmin)
  @RequirePermission(Permission.RestaurantsActivity)
  @Get('admin/restaurants/:id/activity')
  of(@Param('id', ParseUUIDPipe) id: string, @Query() q: ActivityQuery) {
    return this.audit.list(id, q);
  }
}
