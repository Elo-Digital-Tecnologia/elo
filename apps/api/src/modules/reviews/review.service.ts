import type { ReviewSummaryView, ReviewView } from '@elo/core/api/views/review.view';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TableState } from '@elo/core/tables/table-state';
import { Repository } from 'typeorm';
import { TenantRepository } from '#/common/database/tenant.repository.js';
import { TableNotOpenException } from '#/modules/tables/exceptions/table-not-open.exception.js';
import { SessionContext, TableService } from '#/modules/tables/table.service.js';
import { ReviewEntity } from './entities/review.entity.js';
import { AVERAGE_PRECISION, REVIEW_SUMMARY_LIMIT } from './review.constants.js';

const view = (r: ReviewEntity): ReviewView => ({
    id: r.id,
    stars: r.stars,
    comment: r.comment,
    tableName: r.tableName,
    createdAt: r.createdAt.toISOString()
});

@Injectable()
export class ReviewService {
    constructor(
        @InjectRepository(ReviewEntity)
        private readonly reviews: Repository<ReviewEntity>,
        private readonly tables: TableService
    ) {}

    /** The session's own review, so the guest sees what they sent. */
    public async mine(ctx: SessionContext): Promise<ReviewView | null> {
        const r = await this.reviews.findOne({
            where: { sessionId: ctx.sessionId, restaurantId: ctx.restaurantId }
        });
        return r ? view(r) : null;
    }

    /** One review per session; sending again replaces it. Only while the table is open or the bill was requested. */
    public async submit(
        ctx: SessionContext,
        data: { stars: number; comment?: string | null }
    ): Promise<ReviewView> {
        const table = await this.tables.tableOf(ctx);
        if (table.state !== TableState.OPEN && table.state !== TableState.PENDING_CLOSE) {
            throw new TableNotOpenException();
        }
        const existing = await this.reviews.findOne({
            where: { sessionId: ctx.sessionId, restaurantId: ctx.restaurantId }
        });
        const row =
            existing ??
            this.reviews.create({
                restaurantId: ctx.restaurantId,
                sessionId: ctx.sessionId
            });
        Object.assign(row, {
            tableName: table.name,
            stars: data.stars,
            comment: data.comment ?? null
        });
        return view(await this.reviews.save(row));
    }

    /** Average and list (most recent first) for the restaurant panel. */
    public async summary(
        rid: string,
        limit = REVIEW_SUMMARY_LIMIT
    ): Promise<ReviewSummaryView> {
        const repo = new TenantRepository(this.reviews, rid);
        const [recent, agg] = await Promise.all([
            repo.qb('r').orderBy('r.createdAt', 'DESC').take(limit).getMany(),
            repo
                .qb('r')
                .select('COUNT(*)', 'count')
                .addSelect('AVG(r.stars)', 'avg')
                .getRawOne<{ count: string; avg: string | null }>()
        ]);
        const count = Number(agg?.count ?? 0);
        return {
            count,
            average: count
                ? Math.round(Number(agg!.avg) * AVERAGE_PRECISION) / AVERAGE_PRECISION
                : 0,
            reviews: recent.map(view)
        };
    }
}
