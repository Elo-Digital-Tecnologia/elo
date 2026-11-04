import type { JwtUser } from '#/common/types/jwt-user.type.js';
import type { EnvConfig } from '#/config/env.js';
import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@elo/core/roles/roles';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { NoImpersonation } from '#/common/decorators/no-impersonation.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { TenantId } from '#/common/decorators/tenant-id.decorator.js';
import { AdvanceOrderDTO } from './dto/advance-order.dto.js';
import { CancelStaffDTO } from './dto/cancel-staff.dto.js';
import { ListOrdersQueryDTO } from './dto/list-orders-query.dto.js';
import { OrderHistoryPageResponseDTO } from './dto/order-history-page-response.dto.js';
import { OrderHistoryQueryDTO } from './dto/order-history-query.dto.js';
import { OrderResponseDTO } from './dto/order-response.dto.js';
import { OrderService } from './order.service.js';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
    constructor(
        private readonly orders: OrderService,
        private readonly configService: ConfigService<EnvConfig, true>
    ) {}

    @Roles(Role.KITCHEN, Role.WAITER, Role.CASHIER, Role.RESTAURANT_ADMIN, Role.MANAGER)
    @Get('history')
    public async history(
        @TenantId() rid: string,
        @CurrentUser() user: JwtUser,
        @Query() query: OrderHistoryQueryDTO
    ) {
        return OrderHistoryPageResponseDTO.from(
            await this.orders.history(
                rid,
                user,
                query,
                this.configService.getOrThrow('app.timeZone', { infer: true })
            )
        );
    }

    @Roles(Role.KITCHEN, Role.WAITER, Role.CASHIER, Role.RESTAURANT_ADMIN, Role.MANAGER)
    @Get()
    public async list(@TenantId() rid: string, @Query() query: ListOrdersQueryDTO) {
        return (await this.orders.list(rid, query)).map((item) =>
            OrderResponseDTO.from(item)
        );
    }

    /** The kitchen changes the status. */
    @Roles(Role.KITCHEN)
    @Patch(':id/status')
    public async advance(
        @TenantId() rid: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AdvanceOrderDTO
    ) {
        return OrderResponseDTO.from(await this.orders.advance(rid, id, dto.status));
    }

    /** Like moving forward, only the kitchen steps an order back. */
    @Roles(Role.KITCHEN)
    @Patch(':id/revert')
    public async revert(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string) {
        return OrderResponseDTO.from(await this.orders.revert(rid, id));
    }

    @Roles(Role.WAITER, Role.RESTAURANT_ADMIN, Role.MANAGER)
    @NoImpersonation()
    @Post(':id/cancel')
    public async cancel(
        @CurrentUser() user: JwtUser,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CancelStaffDTO
    ) {
        return OrderResponseDTO.from(
            await this.orders.cancelByStaff(user, id, dto.reason)
        );
    }

    /** Return of an order already "ready" (a separate status, with a reason). */
    @Roles(Role.WAITER, Role.RESTAURANT_ADMIN, Role.MANAGER)
    @NoImpersonation()
    @Post(':id/return')
    public async returnOrder(
        @CurrentUser() user: JwtUser,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CancelStaffDTO
    ) {
        return OrderResponseDTO.from(
            await this.orders.returnByStaff(user, id, dto.reason)
        );
    }
}
