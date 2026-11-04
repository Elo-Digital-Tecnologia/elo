import type { JwtUser } from '#/common/types/jwt-user.type.js';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@elo/core/roles/permissions';
import { Role } from '@elo/core/roles/roles';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { RequirePermission } from '#/common/decorators/require-permission.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { RestaurantResponseDTO } from '#/modules/restaurants/dto/restaurant-response.dto.js';
import { BillingService } from './billing.service.js';
import { AdjustDueDateDTO } from './dto/adjust-due-date.dto.js';
import { BillingEntryResponseDTO } from './dto/billing-entry-response.dto.js';
import { ChangePlanDTO } from './dto/change-plan.dto.js';
import { EditPaymentDTO } from './dto/edit-payment.dto.js';
import { PaymentPreviewQueryDTO } from './dto/payment-preview-query.dto.js';
import { PaymentPreviewResponseDTO } from './dto/payment-preview-response.dto.js';
import { PlanListItemResponseDTO } from './dto/plan-list-item-response.dto.js';
import { PlanResponseDTO } from './dto/plan-response.dto.js';
import { PlanDTO } from './dto/plan.dto.js';
import { RecordPaymentDTO } from './dto/record-payment.dto.js';
import { UpdatePlanDTO } from './dto/update-plan.dto.js';
import { VoidEntryDTO } from './dto/void-entry.dto.js';

@ApiTags('admin-billing')
@ApiBearerAuth()
@Roles(Role.SUPERADMIN, Role.ELO_ADMIN)
@Controller('admin')
export class BillingController {
    constructor(private readonly billing: BillingService) {}

    @RequirePermission(Permission.PAYMENTS_VIEW)
    @Get('plans')
    public async plans() {
        return (await this.billing.listPlans()).map((item) =>
            PlanListItemResponseDTO.from(item)
        );
    }

    @RequirePermission(Permission.PLANS_MANAGE)
    @Post('plans')
    public async createPlan(@Body() dto: PlanDTO) {
        return PlanResponseDTO.from(await this.billing.createPlan(dto));
    }

    @RequirePermission(Permission.PLANS_MANAGE)
    @Patch('plans/:id')
    public async updatePlan(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdatePlanDTO
    ) {
        return PlanResponseDTO.from(await this.billing.updatePlan(id, dto));
    }

    @RequirePermission(Permission.PLANS_MANAGE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('plans/:id')
    public deletePlan(@Param('id', ParseUUIDPipe) id: string) {
        return this.billing.deletePlan(id);
    }

    @RequirePermission(Permission.PAYMENTS_RECORD)
    @Patch('restaurants/:id/plan')
    public async changePlan(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ChangePlanDTO,
        @CurrentUser() user: JwtUser
    ) {
        return RestaurantResponseDTO.from(
            await this.billing.changePlan(id, dto.planId, dto.reason, user)
        );
    }

    @RequirePermission(Permission.PAYMENTS_VIEW)
    @Get('restaurants/:id/payments')
    public async history(@Param('id', ParseUUIDPipe) id: string) {
        return (await this.billing.history(id)).map((item) =>
            BillingEntryResponseDTO.from(item)
        );
    }

    @RequirePermission(Permission.PAYMENTS_RECORD)
    @Get('restaurants/:id/payments/preview')
    public async preview(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() q: PaymentPreviewQueryDTO
    ) {
        return PaymentPreviewResponseDTO.from(
            await this.billing.preview(id, q.cycles, q.paidAt)
        );
    }

    @RequirePermission(Permission.PAYMENTS_RECORD)
    @Post('restaurants/:id/payments')
    public async record(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RecordPaymentDTO,
        @CurrentUser() user: JwtUser
    ) {
        return BillingEntryResponseDTO.from(await this.billing.record(id, dto, user));
    }

    @RequirePermission(Permission.PAYMENTS_RECORD)
    @Patch('restaurants/:id/payments/:entryId')
    public async edit(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('entryId', ParseUUIDPipe) entryId: string,
        @Body() dto: EditPaymentDTO,
        @CurrentUser() user: JwtUser
    ) {
        return BillingEntryResponseDTO.from(
            await this.billing.edit(id, entryId, dto, user)
        );
    }

    @RequirePermission(Permission.PAYMENTS_RECORD)
    @Post('restaurants/:id/payments/:entryId/void')
    public async void(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('entryId', ParseUUIDPipe) entryId: string,
        @Body() dto: VoidEntryDTO,
        @CurrentUser() user: JwtUser
    ) {
        return BillingEntryResponseDTO.from(
            await this.billing.void(id, entryId, dto.reason, user)
        );
    }

    @RequirePermission(Permission.PAYMENTS_RECORD)
    @Post('restaurants/:id/due-date')
    public async adjustDueDate(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AdjustDueDateDTO,
        @CurrentUser() user: JwtUser
    ) {
        return BillingEntryResponseDTO.from(
            await this.billing.adjustDueDate(id, dto.dueDate, dto.reason, user)
        );
    }
}
