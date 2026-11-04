import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { Public } from '#/common/decorators/public.decorator.js';
import { HealthResponseDTO } from './dto/health-response.dto.js';
import { DatabaseUnavailableException } from './exceptions/database-unavailable.exception.js';
import { HEALTH_ROUTE } from './health.constants.js';

/** Liveness for the hosting platform: up only while the database answers. */
@ApiTags('health')
@Public()
@SkipThrottle()
@Controller(HEALTH_ROUTE)
export class HealthController {
    constructor(private readonly db: DataSource) {}

    @Get()
    public async check() {
        try {
            await this.db.query('SELECT 1');
        } catch {
            throw new DatabaseUnavailableException();
        }
        return HealthResponseDTO.from({ status: 'ok' });
    }
}
