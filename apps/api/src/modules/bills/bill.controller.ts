import type { JwtUser } from '#/common/types/jwt-user.type.js';
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    ParseUUIDPipe,
    Post,
    Put
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@elo/core/roles/roles';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { NoImpersonation } from '#/common/decorators/no-impersonation.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { TenantId } from '#/common/decorators/tenant-id.decorator.js';
import { BillService } from './bill.service.js';
import { AdjustmentDTO } from './dto/adjustment.dto.js';
import { BillResponseDTO } from './dto/bill-response.dto.js';
import { WaiveFeeDTO } from './dto/waive-fee.dto.js';

/** Cashier desk: waiters, cashiers and admins see and adjust the tables' bills. */
@ApiTags('bills')
@ApiBearerAuth()
@Roles(Role.CASHIER, Role.WAITER, Role.RESTAURANT_ADMIN, Role.MANAGER)
@Controller('bills')
export class BillController {
    constructor(private readonly bills: BillService) {}

    @Get()
    public async list(@TenantId() rid: string) {
        return (await this.bills.list(rid)).map((item) => BillResponseDTO.from(item));
    }

    /** Recalculated from the table's current orders (the amount is never frozen). */
    @Get(':tableId')
    public async view(
        @TenantId() rid: string,
        @Param('tableId', ParseUUIDPipe) tableId: string
    ) {
        return BillResponseDTO.from(await this.bills.view(rid, tableId));
    }

    @NoImpersonation()
    @Put(':tableId/fee')
    public async waive(
        @TenantId() rid: string,
        @Param('tableId', ParseUUIDPipe) tableId: string,
        @Body() dto: WaiveFeeDTO
    ) {
        return BillResponseDTO.from(
            await this.bills.setFeeWaived(rid, tableId, dto.waived)
        );
    }

    @NoImpersonation()
    @Post(':tableId/adjustments')
    public async addAdjustment(
        @TenantId() rid: string,
        @CurrentUser() user: JwtUser,
        @Param('tableId', ParseUUIDPipe) tableId: string,
        @Body() dto: AdjustmentDTO
    ) {
        return BillResponseDTO.from(
            await this.bills.addAdjustment(rid, tableId, dto, user.sub)
        );
    }

    @NoImpersonation()
    @Delete(':tableId/adjustments/:index')
    public async removeAdjustment(
        @TenantId() rid: string,
        @Param('tableId', ParseUUIDPipe) tableId: string,
        @Param('index', ParseIntPipe) index: number
    ) {
        return BillResponseDTO.from(
            await this.bills.removeAdjustment(rid, tableId, index)
        );
    }
}
