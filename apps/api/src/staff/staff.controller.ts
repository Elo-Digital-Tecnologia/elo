import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission, Role } from '@elo/core';
import { CurrentUser, NoImpersonation, RequirePermission, Roles, TenantId } from '../common/decorators';
import { StaffService } from './staff.service';
import type { JwtUser } from '../common/auth-types';
import { ChangePasswordDto, CreateEloStaffDto, CreateRestaurantStaffDto, ResetPasswordDto, SetActiveDto } from './staff.dto';

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
  @NoImpersonation()
  @HttpCode(204)
  @Patch(':id/password')
  async resetPassword(
    @TenantId() restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    if (!(await this.staff.resetPassword(id, restaurantId, dto.password))) throw new NotFoundException();
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

/** Troca da própria senha (qualquer funcionário logado; a chave do superadmin é só de ambiente). */
@ApiTags('staff')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly staff: StaffService) {}

  @NoImpersonation()
  @HttpCode(204)
  @Patch('password')
  async changePassword(@CurrentUser() user: JwtUser, @Body() dto: ChangePasswordDto) {
    if (user.sub === 'superadmin') throw new BadRequestException('superadmin_uses_env_key');
    await this.staff.changePassword(user.sub, dto.current, dto.next);
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

  @HttpCode(204)
  @Patch(':id/password')
  async resetPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetPasswordDto) {
    if (!(await this.staff.resetPassword(id, null, dto.password))) throw new NotFoundException();
  }

  @Patch(':id/active')
  async setActive(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetActiveDto) {
    if (!(await this.staff.setActive(id, null, dto.active))) throw new NotFoundException();
    return { ok: true };
  }
}
