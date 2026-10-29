import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { IsString, Matches, MaxLength } from 'class-validator';
import { SLUG_PATTERN } from '@elo/core';
import { Public } from '../common/decorators';
import type { Env } from '../config/env';
import { CatalogService } from '../catalog/catalog.service';
import { BillsService } from '../bills/bills.service';
import { RefuseFeeDto } from '../bills/bills.dto';
import { CallsService } from '../calls/calls.service';
import { CancelCustomerDto, CreateOrderDto } from '../orders/orders.dto';
import { OrdersService } from '../orders/orders.service';
import { TABLE_COOKIE } from '../realtime/realtime.gateway';
import { ReviewDto } from '../reviews/reviews.dto';
import { ReviewsService } from '../reviews/reviews.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { SessionContext, TablesService } from '../tables/tables.service';
import { Session, TableSessionGuard } from './table-session.guard';
import { IsUUID } from 'class-validator';

class SlugParams {
  @Matches(SLUG_PATTERN) @MaxLength(60) slug: string;
}

class TableParams extends SlugParams {
  @IsString() @Matches(/^[A-Za-z0-9_-]{16,128}$/) token: string;
}

class OrderParams {
  @IsUUID() id: string;
}

/** Rotas do cliente final. Sem JWT; sessão por cookie da mesa e rate limit. */
@ApiTags('public')
@Public()
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('public')
export class PublicController {
  constructor(
    private readonly restaurants: RestaurantsService,
    private readonly catalog: CatalogService,
    private readonly tables: TablesService,
    private readonly orders: OrdersService,
    private readonly calls: CallsService,
    private readonly bills: BillsService,
    private readonly reviews: ReviewsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Link fixo: somente consulta do cardápio. */
  @Get(':slug/menu')
  async menu(@Param() { slug }: SlugParams) {
    const r = await this.restaurants.getBySlug(slug);
    return {
      readOnly: true,
      restaurant: { name: r.name, slug: r.slug, ...this.restaurants.publicProfile(r) },
      menu: await this.catalog.publicMenu(r.id),
    };
  }

  /** Link com token da mesa: cria/retoma a sessão e grava o cookie. */
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(':slug/:token/session')
  async start(
    @Param() { slug, token }: TableParams,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { session, table, restaurant } = await this.tables.startSession(
      slug,
      token,
      req.cookies?.[TABLE_COOKIE],
    );
    res.cookie(TABLE_COOKIE, session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      expires: session.expiresAt,
      path: '/',
    });
    return this.state({ sessionId: session.id, tableId: table.id, restaurantId: restaurant.id });
  }

  @UseGuards(TableSessionGuard)
  @Get('session')
  state(@Session() ctx: SessionContext) {
    return this.buildState(ctx);
  }

  @UseGuards(TableSessionGuard)
  @Post('session/open')
  async open(@Session() ctx: SessionContext) {
    await this.tables.requestOpen(ctx);
    return this.buildState(ctx);
  }

  @UseGuards(TableSessionGuard)
  @Post('session/close')
  async requestClose(@Session() ctx: SessionContext) {
    await this.tables.requestClose(ctx);
    return this.buildState(ctx);
  }

  @UseGuards(TableSessionGuard)
  @Post('session/orders')
  submit(@Session() ctx: SessionContext, @Body() dto: CreateOrderDto) {
    return this.orders.submit(ctx, dto);
  }

  @UseGuards(TableSessionGuard)
  @Post('session/orders/:id/cancel')
  cancel(@Session() ctx: SessionContext, @Param() { id }: OrderParams, @Body() dto: CancelCustomerDto) {
    return this.orders.cancelByCustomer(ctx, id, dto.reason);
  }

  @UseGuards(TableSessionGuard)
  @Post('session/call')
  call(@Session() ctx: SessionContext) {
    return this.calls.create(ctx);
  }

  @UseGuards(TableSessionGuard)
  @Get('session/bill')
  bill(@Session() ctx: SessionContext) {
    return this.bills.viewForSession(ctx);
  }

  /** O cliente pode recusar a taxa de serviço (ou desfazer a própria recusa). */
  @UseGuards(TableSessionGuard)
  @Post('session/bill/fee')
  refuseFee(@Session() ctx: SessionContext, @Body() dto: RefuseFeeDto) {
    return this.bills.refuseFee(ctx, dto.refuse);
  }

  @UseGuards(TableSessionGuard)
  @Get('session/review')
  myReview(@Session() ctx: SessionContext) {
    return this.reviews.mine(ctx);
  }

  /** Avaliação do atendimento (1 a 5, comentário opcional), uma por sessão. */
  @UseGuards(TableSessionGuard)
  @Post('session/review')
  review(@Session() ctx: SessionContext, @Body() dto: ReviewDto) {
    return this.reviews.submit(ctx, dto);
  }

  private async buildState(ctx: SessionContext) {
    const [table, orders, restaurant] = await Promise.all([
      this.tables.tableOf(ctx),
      this.orders.listForSession(ctx),
      this.restaurants.get(ctx.restaurantId),
    ]);
    return {
      readOnly: false,
      restaurant: {
        name: restaurant.name,
        slug: restaurant.slug,
        serviceFeeBps: restaurant.serviceFeeBps,
        ...this.restaurants.publicProfile(restaurant),
        // Só quem está numa mesa recebe o Wi-Fi; o link de consulta nunca.
        wifi: restaurant.wifiName || restaurant.wifiPassword ? { name: restaurant.wifiName, password: restaurant.wifiPassword } : null,
      },
      table: { name: table.name, state: table.state, waiterName: await this.tables.waiterNameOf(table) },
      orders,
      menu: await this.catalog.publicMenu(ctx.restaurantId),
    };
  }
}
