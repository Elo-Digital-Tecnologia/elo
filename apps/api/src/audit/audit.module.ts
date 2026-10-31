import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, StaffUser } from '../database/entities';
import { ActivityController } from './activity.controller';
import { ActivityCleanupService } from './activity-cleanup.service';
import { AuditService } from './audit.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, StaffUser])],
  controllers: [ActivityController],
  providers: [AuditService, ActivityCleanupService],
  exports: [AuditService, ActivityCleanupService],
})
export class AuditModule {}
