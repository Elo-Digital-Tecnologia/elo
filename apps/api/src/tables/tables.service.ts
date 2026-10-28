import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { IsNull, Repository } from 'typeorm';
import { canTransitionTable, canWaiterClose, TableState } from '@elo/core';
import { TenantRepo } from '../common/tenant-repo';
import { DiningTable, Restaurant, TableSession } from '../database/entities';
import type { Env } from '../config/env';
import { RealtimeService } from '../realtime/realtime.service';

const newToken = () => randomBytes(24).toString('base64url');

/** Contexto da sessão do cliente, já validado no servidor. */
export interface SessionContext {
  sessionId: string;
  tableId: string;
  restaurantId: string;
}

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(DiningTable) private readonly tables: Repository<DiningTable>,
    @InjectRepository(TableSession) private readonly sessions: Repository<TableSession>,
    @InjectRepository(Restaurant) private readonly restaurants: Repository<Restaurant>,
    private readonly realtime: RealtimeService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private scoped(rid: string) {
    return new TenantRepo(this.tables, rid);
  }

  // ---- gestão (painel do restaurante) ----

  create(rid: string, name: string) {
    return this.scoped(rid).create({ name, token: newToken(), state: TableState.Closed, waiterId: null });
  }

  list(rid: string) {
    return this.scoped(rid).find({}, { name: 'ASC' });
  }

  /** Mesas que exigem ação do garçom (validar abertura / fechamento). */
  async pending(rid: string) {
    const all = await this.scoped(rid).find({}, { name: 'ASC' });
    return all.filter((t) => t.state === TableState.PendingOpen || t.state === TableState.PendingClose);
  }

  async remove(rid: string, id: string) {
    const table = await this.get(rid, id);
    if (table.state !== TableState.Closed) throw new ConflictException('table_in_use');
    await this.scoped(rid).remove({ id });
  }

  /** Regravação do token: só equipe Elo com permissão (controle na rota). */
  async rotateToken(rid: string, id: string) {
    const repo = this.scoped(rid);
    const table = await this.get(rid, id);
    table.token = newToken();
    await this.closeSessions(table.id);
    table.state = TableState.Closed;
    table.waiterId = null;
    return repo.save(table);
  }

  /** Painel Elo: mesas com token e slug para montar o link impresso. */
  async adminList(rid: string) {
    const restaurant = await this.restaurants.findOne({ where: { id: rid } });
    if (!restaurant) throw new NotFoundException();
    const base = this.config.get('PUBLIC_BASE_URL', { infer: true }).replace(/\/$/, '');
    const rows = await this.list(rid);
    return {
      slug: restaurant.slug,
      tables: rows.map((t) => ({
        id: t.id,
        name: t.name,
        state: t.state,
        token: t.token,
        url: `${base}/${restaurant.slug}/${t.token}`,
      })),
    };
  }

  async qrPng(rid: string, id: string): Promise<Buffer> {
    const table = await this.get(rid, id);
    const restaurant = await this.restaurants.findOneOrFail({ where: { id: rid } });
    const base = this.config.get('PUBLIC_BASE_URL', { infer: true }).replace(/\/$/, '');
    return QRCode.toBuffer(`${base}/${restaurant.slug}/${table.token}`, { margin: 2, width: 512 });
  }

  async get(rid: string, id: string): Promise<DiningTable> {
    const table = await this.scoped(rid).findOne({ id });
    if (!table) throw new NotFoundException();
    return table;
  }

  // ---- garçom ----

  async validateOpen(rid: string, tableId: string, waiterId: string) {
    const table = await this.transition(rid, tableId, TableState.Open);
    table.waiterId = waiterId;
    return this.persist(table);
  }

  /** Garçom recusa o pedido de abertura: mesa volta a fechada e a sessão cai. */
  async rejectOpen(rid: string, tableId: string) {
    const table = await this.transition(rid, tableId, TableState.Closed);
    await this.closeSessions(table.id);
    table.waiterId = null;
    return this.persist(table);
  }

  /** Somente o garçom encerra a mesa; a sessão do cliente também termina. */
  async close(rid: string, tableId: string) {
    const table = await this.get(rid, tableId);
    if (!canWaiterClose(table.state)) throw new ConflictException('invalid_table_state');
    await this.closeSessions(table.id);
    table.state = TableState.Closed;
    table.waiterId = null;
    return this.persist(table);
  }

  // ---- cliente ----

  /**
   * Abre (ou retoma) a sessão da mesa a partir do link. Token inválido ou de outro
   * restaurante responde igual: not found. Uma sessão ativa por mesa; outros
   * aparelhos são bloqueados enquanto ela existir.
   */
  async startSession(slug: string, token: string, cookieSessionId?: string) {
    const restaurant = await this.restaurants.findOne({ where: { slug } });
    const table = restaurant
      ? await this.tables.findOne({ where: { token, restaurantId: restaurant.id } })
      : null;
    if (!restaurant || !table) throw new NotFoundException('invalid_table');

    const active = await this.activeSession(table.id);
    if (active) {
      if (active.id === cookieSessionId) return { session: active, table, restaurant };
      // Mesa ainda fechada: sessão abandonada (só escaneou). Novo scan assume a mesa.
      // Com a mesa em abertura/aberta/fechamento, outros aparelhos ficam bloqueados.
      if (table.state !== TableState.Closed) throw new ConflictException('table_in_use');
      await this.closeSessions(table.id);
    }
    const hours = this.config.get('TABLE_SESSION_HOURS', { infer: true });
    const session = await this.sessions.save(
      this.sessions.create({
        restaurantId: restaurant.id,
        tableId: table.id,
        expiresAt: new Date(Date.now() + hours * 3_600_000),
        closedAt: null,
      }),
    );
    return { session, table, restaurant };
  }

  /** Valida o cookie: sessão existe, não expirou, não foi encerrada. */
  async resolveSession(sessionId: string | undefined): Promise<SessionContext> {
    if (!sessionId || !/^[0-9a-f-]{36}$/.test(sessionId)) throw new UnauthorizedException();
    const s = await this.sessions.findOne({ where: { id: sessionId } });
    if (!s || s.closedAt || s.expiresAt.getTime() < Date.now()) throw new UnauthorizedException();
    return { sessionId: s.id, tableId: s.tableId, restaurantId: s.restaurantId };
  }

  async tableOf(ctx: SessionContext): Promise<DiningTable> {
    return this.get(ctx.restaurantId, ctx.tableId);
  }

  async requestOpen(ctx: SessionContext) {
    const table = await this.transition(ctx.restaurantId, ctx.tableId, TableState.PendingOpen);
    return this.persist(table);
  }

  async requestClose(ctx: SessionContext) {
    const table = await this.transition(ctx.restaurantId, ctx.tableId, TableState.PendingClose);
    return this.persist(table);
  }

  /** Pedidos só saem se a mesa foi aberta e validada pelo garçom. */
  async assertCanOrder(ctx: SessionContext): Promise<DiningTable> {
    const table = await this.tableOf(ctx);
    if (table.state !== TableState.Open) throw new BadRequestException('table_not_open');
    return table;
  }

  // ---- internos ----

  /** Sessão ativa da mesa (a conta pertence a ela). */
  activeSessionOf(tableId: string) {
    return this.activeSession(tableId);
  }

  private activeSession(tableId: string) {
    return this.sessions
      .createQueryBuilder('s')
      .where('s.table_id = :tableId AND s.closed_at IS NULL AND s.expires_at > now()', { tableId })
      .getOne();
  }

  private closeSessions(tableId: string) {
    return this.sessions.update({ tableId, closedAt: IsNull() }, { closedAt: new Date() });
  }

  private async transition(rid: string, tableId: string, to: TableState) {
    const table = await this.get(rid, tableId);
    if (!canTransitionTable(table.state, to)) throw new ConflictException('invalid_table_state');
    table.state = to;
    return table;
  }

  private async persist(table: DiningTable) {
    const saved = await this.scoped(table.restaurantId).save(table);
    this.realtime.publish({
      type: 'table.updated',
      restaurantId: saved.restaurantId,
      tableId: saved.id,
      payload: { id: saved.id, name: saved.name, state: saved.state, waiterId: saved.waiterId },
    });
    return saved;
  }
}
