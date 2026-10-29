import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
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
import { CreateRestaurantDto, RecordPaymentDto, UpdateSettingsDto } from './restaurants.dto';

const ELO = [Role.Superadmin, Role.EloAdmin];

/** Dashboard Elo Digital. */
@ApiTags('admin-restaurants')
@ApiBearerAuth()
@Roles(...ELO)
@Controller('admin')
export class AdminRestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Get('overview')
  overview() {
    return this.restaurants.overview();
  }

  @RequirePermission(Permission.Restaurants)
  @Get('restaurants')
  list() {
    return this.restaurants.list();
  }

  @RequirePermission(Permission.Restaurants)
  @Post('restaurants')
  create(@Body() dto: CreateRestaurantDto) {
    return this.restaurants.create(dto);
  }

  @RequirePermission(Permission.Restaurants)
  @Get('restaurants/:id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const r = await this.restaurants.get(id);
    return { ...r, subscription: this.restaurants.subscriptionOf(r) };
  }

  @RequirePermission(Permission.AccessControl)
  @Post('restaurants/:id/suspend')
  suspend(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurants.setSuspended(id, true);
  }

  @RequirePermission(Permission.AccessControl)
  @Post('restaurants/:id/reactivate')
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurants.setSuspended(id, false);
  }

  /** Entrada da equipe Elo no painel do restaurante (suporte). Token curto, registrado em auditoria. */
  @RequirePermission(Permission.RestaurantAccess)
  @Post('restaurants/:id/access')
  access(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.restaurants.accessAs(id, user);
  }

  @RequirePermission(Permission.Subscriptions)
  @Get('restaurants/:id/payments')
  payments(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurants.paymentHistory(id);
  }

  @RequirePermission(Permission.Subscriptions)
  @Post('restaurants/:id/payments')
  recordPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.restaurants.recordPayment(id, dto, user.sub);
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
  async settings(@TenantId() restaurantId: string, @Body() dto: UpdateSettingsDto) {
    return this.profile(await this.restaurants.updateSettings(restaurantId, dto));
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
