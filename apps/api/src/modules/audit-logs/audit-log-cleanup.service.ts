import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import type { EnvConfig } from '#/config/env.js';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity.js';

/**
 * Keeps the activity log from growing forever: entries older than
 * `ACTIVITY_RETENTION_DAYS` are erased every `ACTIVITY_CLEANUP_HOURS`.
 * Orders and reports are not touched.
 */
@Injectable()
export class AuditLogCleanupService
    implements OnApplicationBootstrap, OnApplicationShutdown
{
    private readonly log = new Logger(AuditLogCleanupService.name);
    private timer?: ReturnType<typeof setInterval>;

    constructor(
        @InjectRepository(AuditLogEntity)
        private readonly logs: Repository<AuditLogEntity>,
        private readonly configService: ConfigService<EnvConfig, true>
    ) {}

    public onApplicationBootstrap() {
        void this.run();
        this.timer = setInterval(
            () => void this.run(),
            this.configService.getOrThrow('retention.auditLogCleanupEveryMs', {
                infer: true
            })
        );
        this.timer.unref();
    }

    public onApplicationShutdown() {
        clearInterval(this.timer);
    }

    /** Erases the expired entries and returns how many were removed. */
    public async run(now = new Date()): Promise<number> {
        const cutoff = new Date(
            now.getTime() -
                this.configService.getOrThrow('retention.auditLogMs', { infer: true })
        );
        try {
            const { affected } = await this.logs.delete({ createdAt: LessThan(cutoff) });
            if (affected)
                this.log.log(
                    `Erased ${affected} activity entries older than ${cutoff.toISOString()}`
                );
            return affected ?? 0;
        } catch (e) {
            this.log.error('Activity cleanup failed', e as Error);
            return 0;
        }
    }
}
