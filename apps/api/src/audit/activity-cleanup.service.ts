import { Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import type { Env } from '../config/env';
import { AuditLog } from '../database/entities';

/**
 * Keeps the activity log from growing forever: entries older than
 * `ACTIVITY_RETENTION_DAYS` are erased every `ACTIVITY_CLEANUP_HOURS`.
 * Orders and reports are not touched.
 */
@Injectable()
export class ActivityCleanupService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger(ActivityCleanupService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onApplicationBootstrap() {
    void this.run();
    this.timer = setInterval(() => void this.run(), this.config.get('ACTIVITY_CLEANUP_HOURS', { infer: true }) * 3_600_000);
    this.timer.unref();
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  /** Erases the expired entries and returns how many were removed. */
  async run(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - this.config.get('ACTIVITY_RETENTION_DAYS', { infer: true }) * 86_400_000);
    try {
      const { affected } = await this.logs.delete({ createdAt: LessThan(cutoff) });
      if (affected) this.log.log(`Erased ${affected} activity entries older than ${cutoff.toISOString()}`);
      return affected ?? 0;
    } catch (e) {
      this.log.error('Activity cleanup failed', e as Error);
      return 0;
    }
  }
}
