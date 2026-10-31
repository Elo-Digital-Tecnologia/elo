import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { canGrant, Permission, RestaurantManagerRoles, Role, withRequired } from '@elo/core';
import { CurrentUser, NoImpersonation, RequirePermission, Roles, TenantId } from '../common/decorators';
import { StaffService } from './staff.service';
import type { JwtUser } from '../common/auth-types';
import {
  ChangePasswordDto,
  CreateEloStaffDto,
  CreateRestaurantStaffDto,
  ResetPasswordDto,
  SetActiveDto,
  TransferOwnershipDto,
  UpdateEloStaffDto,
  UpdateRestaurantStaffDto,
} from './staff.dto';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Roles(...RestaurantManagerRoles)
  @Get()
  list(@TenantId() restaurantId: string) {
    return this.staff.list(restaurantId);
  }

  @Roles(...RestaurantManagerRoles)
  @Post()
  create(@TenantId() restaurantId: string, @Body() dto: CreateRestaurantStaffDto, @CurrentUser() actor: JwtUser) {
    return this.staff.create({ restaurantId, ...dto }, actor);
  }

  @Roles(...RestaurantManagerRoles)
  @Patch(':id')
  update(
    @TenantId() restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtUser,
    @Body() dto: UpdateRestaurantStaffDto,
  ) {
    return this.staff.update(id, restaurantId, actor, dto);
  }

  @Roles(...RestaurantManagerRoles)
  @HttpCode(204)
  @Delete(':id')
  archive(@TenantId() restaurantId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtUser) {
    return this.staff.archive(id, restaurantId, actor);
  }

  /** Elo support may set a new password here: it is how a locked-out administrator gets back in. */
  @Roles(...RestaurantManagerRoles)
  @HttpCode(204)
  @Patch(':id/password')
  resetPassword(
    @TenantId() restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtUser,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.staff.resetPassword(id, restaurantId, actor, dto.password);
  }

  @Roles(Role.RestaurantAdmin)
  @NoImpersonation()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(204)
  @Post(':id/transfer-ownership')
  transferOwnership(
    @TenantId() restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtUser,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.staff.transferOwnership(restaurantId, id, actor, { password: dto.password });
  }

  @Roles(...RestaurantManagerRoles)
  @Patch(':id/active')
  async setActive(
    @TenantId() restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtUser,
    @Body() dto: SetActiveDto,
  ) {
    await this.staff.setActive(id, restaurantId, actor, dto.active);
    return { ok: true };
  }
}

/** Troca da própria senha (qualquer funcionário logado; a chave do superadmin é só de ambiente). */
@ApiTags('staff')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly staff: StaffService) {}

  /** Who is signed in, with the profile photo the shell shows in the header. */
  @Get()
  async me(@CurrentUser() user: JwtUser) {
    if (user.sub === 'superadmin' || user.impersonatedBy) return { id: user.sub, name: user.name ?? null, avatarUrl: null };
    const [row] = await this.staff.profiles([user.sub]);
    return { id: user.sub, name: row?.name ?? user.name ?? null, avatarUrl: row?.avatarUrl ?? null };
  }

  @NoImpersonation()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
@RequirePermission(Permission.TeamManage)
@Controller('admin/staff')
export class EloStaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list() {
    return this.staff.list(null);
  }

  @Post()
  create(@Body() dto: CreateEloStaffDto, @CurrentUser() actor: JwtUser) {
    return this.staff.create({
      restaurantId: null,
      username: dto.username,
      password: dto.password,
      name: dto.name,
      roles: [Role.EloAdmin],
      permissions: grantable(actor, dto.permissions),
    }, actor);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtUser, @Body() dto: UpdateEloStaffDto) {
    if (dto.permissions && actor.sub === id) throw new ForbiddenException('self');
    return this.staff.update(id, null, actor, {
      name: dto.name,
      ...(dto.permissions ? { permissions: grantable(actor, dto.permissions) } : {}),
    });
  }

  @HttpCode(204)
  @Patch(':id/password')
  resetPassword(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtUser, @Body() dto: ResetPasswordDto) {
    return this.staff.resetPassword(id, null, actor, dto.password);
  }

  @Patch(':id/active')
  async setActive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtUser, @Body() dto: SetActiveDto) {
    await this.staff.setActive(id, null, actor, dto.active);
    return { ok: true };
  }

  @HttpCode(204)
  @Delete(':id')
  archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtUser) {
    return this.staff.archive(id, null, actor);
  }
}

/** Adds what each permission depends on, then refuses anything the actor may not hand out. */
function grantable(actor: JwtUser, requested: string[]): string[] {
  const perms = withRequired(requested);
  const superadmin = actor.roles.includes(Role.Superadmin);
  const denied = perms.filter((p) => !canGrant({ superadmin, permissions: actor.permissions }, p));
  if (denied.length) throw new ForbiddenException({ statusCode: 403, message: 'cannot_grant', permissions: denied });
  return perms;
}
