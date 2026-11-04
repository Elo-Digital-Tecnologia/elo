import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffSessionEntity } from './entities/staff-session.entity.js';
import { SessionService } from './session.service.js';

@Module({
    imports: [TypeOrmModule.forFeature([StaffSessionEntity])],
    providers: [SessionService],
    exports: [SessionService]
})
export class SessionModule {}
