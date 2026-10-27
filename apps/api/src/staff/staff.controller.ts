import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission, Role } from '@elo/core';
import { RequirePermission, Roles, TenantId } from '../common/decorators';
import { StaffService } from './staff.service';
import { CreateEloStaffDto, CreateRestaurantStaffDto, SetActiveDto } from './staff.dto';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Roles(Role.RestaurantAdmin)
  @Get()
  list(@TenantId() restaurantId: string) {
    return this.staff.list(restaurantId);
  }

  @Roles(Role.RestaurantAdmin)
  @Post()
  create(@TenantId() restaurantId: string, @Body() dto: CreateRestaurantStaffDto) {
    return this.staff.create({ restaurantId, ...dto, role: dto.role as Role });
  }

  @Roles(Role.RestaurantAdmin)
  @Patch(':id/active')
  async setActive(
    @TenantId() restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetActiveDto,
  ) {
    if (!(await this.staff.setActive(id, restaurantId, dto.active))) throw new NotFoundException();
    return { ok: true };
  }
}

/** Gestão da equipe Elo Digital: só superadmin (tem todas as permissões e a de configurações). */
@ApiTags('admin-staff')
@ApiBearerAuth()
@Roles(Role.Superadmin, Role.EloAdmin)
@RequirePermission(Permission.Settings)
@Controller('admin/staff')
export class EloStaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list() {
    return this.staff.list(null);
  }

  @Post()
  create(@Body() dto: CreateEloStaffDto) {
    return this.staff.create({
      restaurantId: null,
      username: dto.username,
      password: dto.password,
      role: Role.EloAdmin,
      permissions: dto.permissions,
    });
  }

  @Patch(':id/active')
  async setActive(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetActiveDto) {
    if (!(await this.staff.setActive(id, null, dto.active))) throw new NotFoundException();
    return { ok: true };
  }
}
