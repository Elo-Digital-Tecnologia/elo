import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffUserEntity } from '#/modules/staff/entities/staff-user.entity.js';
import { AuditLogCleanupService } from './audit-log-cleanup.service.js';
import { AuditLogController } from './audit-log.controller.js';
import { AuditLogService } from './audit-log.service.js';
import { AuditLogEntity } from './entities/audit-log.entity.js';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([AuditLogEntity, StaffUserEntity])],
    controllers: [AuditLogController],
    providers: [AuditLogService, AuditLogCleanupService],
    exports: [AuditLogService, AuditLogCleanupService]
})
export class AuditLogModule {}
