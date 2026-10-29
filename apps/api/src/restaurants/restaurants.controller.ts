import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission, Role } from '@elo/core';
import {
  AllowSuspended,
  CurrentUser,
  RequirePermission,
  Roles,
  TenantId,
} from '../common/decorators';
import type { JwtUser } from '../common/auth-types';
import type { Restaurant } from '../database/entities';
import { RestaurantsService } from './restaurants.service';
import { RestaurantLifecycleService } from './restaurant-lifecycle.service';
import {
  CreateRestaurantDto,
  DeleteRestaurantDto,
  EditRestaurantDto,
  RecordPaymentDto,
  RestaurantListQuery,
  UpdateSettingsDto,
} from './restaurants.dto';

const ELO = [Role.Superadmin, Role.EloAdmin];

/** Dashboard Elo Digital. */
@ApiTags('admin-restaurants')
@ApiBearerAuth()
@Roles(...ELO)
@Controller('admin')
export class AdminRestaurantsController {
  constructor(
    private readonly restaurants: RestaurantsService,
    private readonly lifecycle: RestaurantLifecycleService,
  ) {}

  @Get('overview')
  overview() {
    return this.restaurants.overview();
  }

  @RequirePermission(Permission.RestaurantsView)
  @Get('restaurants')
  list(@Query() q: RestaurantListQuery, @CurrentUser() user: JwtUser) {
    const canSeeDeleted = user.roles.includes(Role.Superadmin) || user.permissions.includes(Permission.RestaurantsDelete);
    if (q.status === 'deleted' && !canSeeDeleted) throw new ForbiddenException();
    return this.restaurants.search(q, canSeeDeleted);
  }

  @RequirePermission(Permission.RestaurantsCreate)
  @Post('restaurants')
  create(@Body() dto: CreateRestaurantDto) {
    return this.restaurants.create(dto);
  }

  @RequirePermission(Permission.RestaurantsView)
  @Get('restaurants/:id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const r = await this.restaurants.get(id);
    return { ...r, subscription: this.restaurants.subscriptionOf(r) };
  }

  @RequirePermission(Permission.RestaurantsEdit)
  @Patch('restaurants/:id')
  edit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EditRestaurantDto, @CurrentUser() user: JwtUser) {
    return this.restaurants.edit(id, dto, user);
  }

  @RequirePermission(Permission.RestaurantsSuspend)
  @Post('restaurants/:id/suspend')
  suspend(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.lifecycle.setSuspended(id, true, user);
  }

  @RequirePermission(Permission.RestaurantsSuspend)
  @Post('restaurants/:id/reactivate')
  reactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.lifecycle.setSuspended(id, false, user);
  }

  /** Soft delete of a suspended restaurant; the slug must be typed back. */
  @RequirePermission(Permission.RestaurantsDelete)
  @HttpCode(204)
  @Delete('restaurants/:id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeleteRestaurantDto, @CurrentUser() user: JwtUser) {
    return this.lifecycle.remove(id, user, dto.confirmSlug);
  }

  @RequirePermission(Permission.RestaurantsDelete)
  @Post('restaurants/:id/restore')
  restore(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.lifecycle.restore(id, user);
  }

  /** Data of a restaurant (deleted ones included) to hand back to the client. */
  @RequirePermission(Permission.RestaurantsDelete)
  @Get('restaurants/:id/export')
  export(@Param('id', ParseUUIDPipe) id: string) {
    return this.lifecycle.export(id);
  }

  /** Entrada da equipe Elo no painel do restaurante (suporte). Token curto, registrado em auditoria. */
  @RequirePermission(Permission.RestaurantsAccess)
  @Post('restaurants/:id/access')
  access(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.restaurants.accessAs(id, user);
  }

  @RequirePermission(Permission.PaymentsView)
  @Get('restaurants/:id/payments')
  payments(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurants.paymentHistory(id);
  }

  @RequirePermission(Permission.PaymentsRecord)
  @Post('restaurants/:id/payments')
  recordPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.restaurants.recordPayment(id, dto, user);
  }
}

/** Visão do próprio restaurante sobre sua assinatura. */
@ApiTags('subscription')
@ApiBearerAuth()
@Controller('restaurant')
export class RestaurantSelfController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @AllowSuspended()
  @Roles(Role.RestaurantAdmin)
  @Get('subscription')
  async subscription(@TenantId() restaurantId: string) {
    return this.restaurants.subscriptionOf(await this.restaurants.get(restaurantId));
  }

  @Roles(...RestaurantStaff())
  @Get('me')
  async me(@TenantId() restaurantId: string) {
    return this.profile(await this.restaurants.get(restaurantId));
  }

  @Roles(Role.RestaurantAdmin)
  @Patch('settings')
  async settings(@TenantId() restaurantId: string, @Body() dto: UpdateSettingsDto, @CurrentUser() user: JwtUser) {
    return this.profile(await this.restaurants.updateSettings(restaurantId, dto, user));
  }

  private profile(r: Restaurant) {
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      managerName: r.managerName,
      managerContact: r.managerContact,
      serviceFeeBps: r.serviceFeeBps,
      ...this.restaurants.publicProfile(r),
      wifiName: r.wifiName,
      wifiPassword: r.wifiPassword,
      openingHours: r.openingHours,
      subscription: this.restaurants.subscriptionOf(r),
    };
  }
}

function RestaurantStaff(): Role[] {
  return [Role.RestaurantAdmin, Role.Waiter, Role.Kitchen, Role.Cashier];
}
