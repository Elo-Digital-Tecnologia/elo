import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission, Role } from '@elo/core';
import { CurrentUser, RequirePermission, Roles } from '../common/decorators';
import type { JwtUser } from '../common/auth-types';
import { BillingService } from './billing.service';
import { AdjustDueDateDto, ChangePlanDto, EditPaymentDto, PaymentPreviewQuery, PlanDto, RecordPaymentDto, UpdatePlanDto, VoidEntryDto } from './billing.dto';

@ApiTags('admin-billing')
@ApiBearerAuth()
@Roles(Role.Superadmin, Role.EloAdmin)
@Controller('admin')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @RequirePermission(Permission.PaymentsView)
  @Get('plans')
  plans() {
    return this.billing.listPlans();
  }

  @RequirePermission(Permission.PlansManage)
  @Post('plans')
  createPlan(@Body() dto: PlanDto) {
    return this.billing.createPlan(dto);
  }

  @RequirePermission(Permission.PlansManage)
  @Patch('plans/:id')
  updatePlan(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlanDto) {
    return this.billing.updatePlan(id, dto);
  }

  @RequirePermission(Permission.PlansManage)
  @HttpCode(204)
  @Delete('plans/:id')
  deletePlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.deletePlan(id);
  }

  @RequirePermission(Permission.PaymentsRecord)
  @Patch('restaurants/:id/plan')
  changePlan(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangePlanDto, @CurrentUser() user: JwtUser) {
    return this.billing.changePlan(id, dto.planId, user);
  }

  @RequirePermission(Permission.PaymentsView)
  @Get('restaurants/:id/payments')
  history(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.history(id);
  }

  @RequirePermission(Permission.PaymentsRecord)
  @Get('restaurants/:id/payments/preview')
  preview(@Param('id', ParseUUIDPipe) id: string, @Query() q: PaymentPreviewQuery) {
    return this.billing.preview(id, q.cycles, q.paidAt);
  }

  @RequirePermission(Permission.PaymentsRecord)
  @Post('restaurants/:id/payments')
  record(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordPaymentDto, @CurrentUser() user: JwtUser) {
    return this.billing.record(id, dto, user);
  }

  @RequirePermission(Permission.PaymentsRecord)
  @Patch('restaurants/:id/payments/:entryId')
  edit(@Param('id', ParseUUIDPipe) id: string, @Param('entryId', ParseUUIDPipe) entryId: string, @Body() dto: EditPaymentDto, @CurrentUser() user: JwtUser) {
    return this.billing.edit(id, entryId, dto, user);
  }

  @RequirePermission(Permission.PaymentsRecord)
  @Post('restaurants/:id/payments/:entryId/void')
  void(@Param('id', ParseUUIDPipe) id: string, @Param('entryId', ParseUUIDPipe) entryId: string, @Body() dto: VoidEntryDto, @CurrentUser() user: JwtUser) {
    return this.billing.void(id, entryId, dto.reason, user);
  }

  @RequirePermission(Permission.PaymentsRecord)
  @Post('restaurants/:id/due-date')
  adjustDueDate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdjustDueDateDto, @CurrentUser() user: JwtUser) {
    return this.billing.adjustDueDate(id, dto.dueDate, dto.reason, user);
  }
}
