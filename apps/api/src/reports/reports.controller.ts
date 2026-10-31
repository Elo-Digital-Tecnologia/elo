import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantManagerRoles } from '@elo/core';
import { Roles, TenantId } from '../common/decorators';
import { ReportQuery } from './reports.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Roles(...RestaurantManagerRoles)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  get(@TenantId() rid: string, @Query() q: ReportQuery) {
    return this.reports.build(rid, q.from, q.to);
  }

  @Get('staff')
  staff(@TenantId() rid: string, @Query() q: ReportQuery) {
    return this.reports.staff(rid, q.from, q.to);
  }
}
