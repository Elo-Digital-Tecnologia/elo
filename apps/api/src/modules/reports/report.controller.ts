import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantManagerRoles } from '@elo/core/roles/roles';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { TenantId } from '#/common/decorators/tenant-id.decorator.js';
import { ReportQueryDTO } from './dto/report-query.dto.js';
import { ReportResponseDTO } from './dto/report-response.dto.js';
import { StaffReportResponseDTO } from './dto/staff-report-response.dto.js';
import { ReportService } from './report.service.js';

@ApiTags('reports')
@ApiBearerAuth()
@Roles(...RestaurantManagerRoles)
@Controller('reports')
export class ReportController {
    constructor(private readonly reports: ReportService) {}

    @Get()
    public async get(@TenantId() rid: string, @Query() q: ReportQueryDTO) {
        return ReportResponseDTO.from(await this.reports.build(rid, q.from, q.to));
    }

    @Get('staff')
    public async staff(@TenantId() rid: string, @Query() q: ReportQueryDTO) {
        return StaffReportResponseDTO.from(await this.reports.staff(rid, q.from, q.to));
    }
}
