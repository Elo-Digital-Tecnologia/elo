import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableState, type ReviewSummaryView, type ReviewView } from '@elo/core';
import { TenantRepo } from '../common/tenant-repo';
import { Review } from '../database/entities';
import { SessionContext, TablesService } from '../tables/tables.service';

const view = (r: Review): ReviewView => ({ id: r.id, stars: r.stars, comment: r.comment, tableName: r.tableName, createdAt: r.createdAt.toISOString() });

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    private readonly tables: TablesService,
  ) {}

  /** Avaliação da própria sessão, para o cliente ver o que já enviou. */
  async mine(ctx: SessionContext): Promise<ReviewView | null> {
    const r = await this.reviews.findOne({ where: { sessionId: ctx.sessionId, restaurantId: ctx.restaurantId } });
    return r ? view(r) : null;
  }

  /** Uma avaliação por sessão; enviar de novo troca a anterior. Só com a mesa aberta ou com a conta pedida. */
  async submit(ctx: SessionContext, data: { stars: number; comment?: string | null }): Promise<ReviewView> {
    const table = await this.tables.tableOf(ctx);
    if (table.state !== TableState.Open && table.state !== TableState.PendingClose) {
      throw new BadRequestException('table_not_open');
    }
    const existing = await this.reviews.findOne({ where: { sessionId: ctx.sessionId, restaurantId: ctx.restaurantId } });
    const row = existing ?? this.reviews.create({ restaurantId: ctx.restaurantId, sessionId: ctx.sessionId });
    Object.assign(row, { tableName: table.name, stars: data.stars, comment: data.comment ?? null });
    return view(await this.reviews.save(row));
  }

  /** Média e lista (mais recentes primeiro) para o painel do restaurante. */
  async summary(rid: string, limit = 100): Promise<ReviewSummaryView> {
    const repo = new TenantRepo(this.reviews, rid);
    const [recent, agg] = await Promise.all([
      repo.qb('r').orderBy('r.createdAt', 'DESC').take(limit).getMany(),
      repo.qb('r').select('COUNT(*)', 'count').addSelect('AVG(r.stars)', 'avg').getRawOne<{ count: string; avg: string | null }>(),
    ]);
    const count = Number(agg?.count ?? 0);
    return { count, average: count ? Math.round(Number(agg!.avg) * 10) / 10 : 0, reviews: recent.map(view) };
  }
}
