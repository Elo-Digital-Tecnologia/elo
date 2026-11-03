import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffSession } from '../database/entities';
import { SessionsService } from './sessions.service';

@Module({
    imports: [TypeOrmModule.forFeature([StaffSession])],
    providers: [SessionsService],
    exports: [SessionsService]
})
export class SessionsModule {}
