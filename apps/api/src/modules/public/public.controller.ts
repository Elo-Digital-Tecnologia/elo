import type { Request, Response } from 'express';
import type { EnvConfig } from '#/config/env.js';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Req,
    Res,
    UseGuards
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { canRequestBill } from '@elo/core/orders/order-status';
import { TableState } from '@elo/core/tables/table-state';
import { RATE_LIMITS, TABLE_SESSION_COOKIE_NAME } from '#/common/constants.js';
import { Public } from '#/common/decorators/public.decorator.js';
import { BillService } from '#/modules/bills/bill.service.js';
import { BillResponseDTO } from '#/modules/bills/dto/bill-response.dto.js';
import { RefuseFeeDTO } from '#/modules/bills/dto/refuse-fee.dto.js';
import { CallService } from '#/modules/calls/call.service.js';
import { WaiterCallResponseDTO } from '#/modules/calls/dto/waiter-call-response.dto.js';
import { CatalogService } from '#/modules/catalog/catalog.service.js';
import { CancelCustomerDTO } from '#/modules/orders/dto/cancel-customer.dto.js';
import { CreateOrderDTO } from '#/modules/orders/dto/create-order.dto.js';
import { OrderResponseDTO } from '#/modules/orders/dto/order-response.dto.js';
import { OrderService } from '#/modules/orders/order.service.js';
import { PushKeyResponseDTO } from '#/modules/push/dto/push-key-response.dto.js';
import { SubscribeDTO } from '#/modules/push/dto/subscribe.dto.js';
import { UnsubscribeDTO } from '#/modules/push/dto/unsubscribe.dto.js';
import { PushTableNotOpenException } from '#/modules/push/exceptions/push-table-not-open.exception.js';
import { PushService } from '#/modules/push/push.service.js';
import { TableTicketService } from '#/modules/realtime/table-ticket.service.js';
import { RestaurantService } from '#/modules/restaurants/restaurant.service.js';
import { ReviewResponseDTO } from '#/modules/reviews/dto/review-response.dto.js';
import { ReviewDTO } from '#/modules/reviews/dto/review.dto.js';
import { ReviewService } from '#/modules/reviews/review.service.js';
import { OrdersInProgressException } from '#/modules/tables/exceptions/orders-in-progress.exception.js';
import { SessionContext, TableService } from '#/modules/tables/table.service.js';
import { CurrentTableSession } from './decorators/current-table-session.decorator.js';
import { OrderParamsDTO } from './dto/order-params.dto.js';
import { PublicMenuResponseDTO } from './dto/public-menu-response.dto.js';
import { RestaurantLinkResponseDTO } from './dto/restaurant-link-response.dto.js';
import { SessionStateResponseDTO } from './dto/session-state-response.dto.js';
import { SlugParamsDTO } from './dto/slug-params.dto.js';
import { TableParamsDTO } from './dto/table-params.dto.js';
import { TableSessionGuard } from './guards/table-session.guard.js';

/** Guest routes. No JWT; a table session cookie and rate limiting. */
@ApiTags('public')
@Public()
@Throttle(RATE_LIMITS.GUEST)
@Controller('public')
export class PublicController {
    constructor(
        private readonly restaurants: RestaurantService,
        private readonly catalog: CatalogService,
        private readonly tables: TableService,
        private readonly orders: OrderService,
        private readonly calls: CallService,
        private readonly bills: BillService,
        private readonly reviews: ReviewService,
        private readonly push: PushService,
        private readonly configService: ConfigService<EnvConfig, true>,
        private readonly tickets: TableTicketService
    ) {}

    /** The restaurant's current link, for screens opened from an old one (also while its menu is off the air). */
    @Get(':slug/link')
    public async link(@Param() { slug }: SlugParamsDTO) {
        return RestaurantLinkResponseDTO.from({
            slug: (await this.restaurants.getBySlug(slug)).slug
        });
    }

    /** Fixed link: menu only, read-only. */
    @Get(':slug/menu')
    public async menu(@Param() { slug }: SlugParamsDTO) {
        const r = await this.restaurants.getBySlug(slug);
        await this.restaurants.assertPublished(r);
        return PublicMenuResponseDTO.from({
            readOnly: true,
            restaurant: {
                name: r.name,
                slug: r.slug,
                ...(await this.restaurants.publicProfile(r))
            },
            menu: await this.catalog.publicMenu(r.id)
        });
    }

    /** Link with the table token: creates or resumes the session and sets the cookie. */
    @Throttle(RATE_LIMITS.TABLE_SESSION_START)
    @Post(':slug/:token/session')
    public async start(
        @Param() { slug, token }: TableParamsDTO,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        // No contract in force, no menu: a new visit is refused before any session is made.
        await this.restaurants.assertPublished(await this.restaurants.getBySlug(slug));
        const { session, table, restaurant } = await this.tables.startSession(
            slug,
            token,
            req.cookies?.[TABLE_SESSION_COOKIE_NAME]
        );
        res.cookie(TABLE_SESSION_COOKIE_NAME, session.id, {
            httpOnly: true,
            sameSite: 'lax',
            secure: this.configService.getOrThrow('app.isProduction', { infer: true }),
            expires: session.expiresAt,
            path: '/'
        });
        return SessionStateResponseDTO.from(
            await this.state({
                sessionId: session.id,
                tableId: table.id,
                restaurantId: restaurant.id
            })
        );
    }

    @UseGuards(TableSessionGuard)
    @Get('session')
    public async state(@CurrentTableSession() ctx: SessionContext) {
        return SessionStateResponseDTO.from(await this.buildState(ctx));
    }

    @UseGuards(TableSessionGuard)
    @Post('session/open')
    public async open(@CurrentTableSession() ctx: SessionContext) {
        await this.published(ctx);
        await this.tables.requestOpen(ctx);
        return SessionStateResponseDTO.from(await this.buildState(ctx));
    }

    @UseGuards(TableSessionGuard)
    @Post('session/close')
    public async requestClose(@CurrentTableSession() ctx: SessionContext) {
        const orders = await this.orders.listForSession(ctx);
        if (!canRequestBill(orders.map((o) => o.status)))
            throw new OrdersInProgressException();
        await this.tables.requestClose(ctx);
        return SessionStateResponseDTO.from(await this.buildState(ctx));
    }

    @UseGuards(TableSessionGuard)
    @Post('session/orders')
    public async submit(
        @CurrentTableSession() ctx: SessionContext,
        @Body() dto: CreateOrderDTO
    ) {
        await this.published(ctx);
        return OrderResponseDTO.from(await this.orders.submit(ctx, dto));
    }

    @UseGuards(TableSessionGuard)
    @Post('session/orders/:id/cancel')
    public async cancel(
        @CurrentTableSession() ctx: SessionContext,
        @Param() { id }: OrderParamsDTO,
        @Body() dto: CancelCustomerDTO
    ) {
        return OrderResponseDTO.from(
            await this.orders.cancelByCustomer(ctx, id, dto.reason ?? undefined)
        );
    }

    /** Null when the server has no push keys: the page then offers only on-screen alerts. */
    @Get('push-key')
    public pushKey() {
        return PushKeyResponseDTO.from({ key: this.push.publicKey() });
    }

    /** The guest asks for news about the table; only while it is open, and erased when it closes. */
    @UseGuards(TableSessionGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Post('session/push')
    public async subscribePush(
        @CurrentTableSession() ctx: SessionContext,
        @Body() dto: SubscribeDTO
    ) {
        const table = await this.tables.tableOf(ctx);
        if (table.state !== TableState.OPEN && table.state !== TableState.PENDING_CLOSE)
            throw new PushTableNotOpenException();
        await this.push.subscribeGuest(ctx, dto);
    }

    @UseGuards(TableSessionGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('session/push')
    public unsubscribePush(
        @CurrentTableSession() ctx: SessionContext,
        @Body() dto: UnsubscribeDTO
    ) {
        return this.push.unsubscribeGuest(ctx.sessionId, dto.endpoint);
    }

    @UseGuards(TableSessionGuard)
    @Post('session/call')
    public async call(@CurrentTableSession() ctx: SessionContext) {
        await this.published(ctx);
        return WaiterCallResponseDTO.from(await this.calls.create(ctx));
    }

    @UseGuards(TableSessionGuard)
    @Get('session/bill')
    public async bill(@CurrentTableSession() ctx: SessionContext) {
        return BillResponseDTO.from(await this.bills.viewForSession(ctx));
    }

    /** The guest may refuse the service fee (or undo their own refusal). */
    @UseGuards(TableSessionGuard)
    @Post('session/bill/fee')
    public async refuseFee(
        @CurrentTableSession() ctx: SessionContext,
        @Body() dto: RefuseFeeDTO
    ) {
        return BillResponseDTO.from(await this.bills.refuseFee(ctx, dto.refuse));
    }

    @UseGuards(TableSessionGuard)
    @Get('session/review')
    public async myReview(@CurrentTableSession() ctx: SessionContext) {
        const review = await this.reviews.mine(ctx);
        return review ? ReviewResponseDTO.from(review) : null;
    }

    /** Service review (1 to 5, optional comment), one per session. */
    @UseGuards(TableSessionGuard)
    @Post('session/review')
    public async review(
        @CurrentTableSession() ctx: SessionContext,
        @Body() dto: ReviewDTO
    ) {
        return ReviewResponseDTO.from(await this.reviews.submit(ctx, dto));
    }

    private async buildState(ctx: SessionContext) {
        const [table, orders, restaurant] = await Promise.all([
            this.tables.tableOf(ctx),
            this.orders.listForSession(ctx),
            this.restaurants.get(ctx.restaurantId)
        ]);
        return {
            readOnly: false,
            restaurant: {
                name: restaurant.name,
                slug: restaurant.slug,
                serviceFeeBps: restaurant.serviceFeeBps,
                guestFeeRefusal: restaurant.guestFeeRefusal,
                ...(await this.restaurants.publicProfile(restaurant)),
                // Only guests at a table get the Wi-Fi; the read-only link never does.
                wifi:
                    restaurant.wifiName || restaurant.wifiPassword
                        ? { name: restaurant.wifiName, password: restaurant.wifiPassword }
                        : null
            },
            table: {
                name: table.name,
                state: table.state,
                waiterName: await this.tables.waiterNameOf(table)
            },
            orders,
            menu: await this.catalog.publicMenu(ctx.restaurantId),
            realtimeTicket: this.tickets.sign(ctx.sessionId)
        };
    }

    /**
     * A table already open when the contract ends can still see and close its bill, but
     * opens, orders and calls nothing new.
     */
    private async published(ctx: SessionContext): Promise<void> {
        await this.restaurants.assertPublished(
            await this.restaurants.get(ctx.restaurantId)
        );
    }
}
