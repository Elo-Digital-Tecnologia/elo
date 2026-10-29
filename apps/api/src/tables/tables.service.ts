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
import { EntityManager, In, IsNull, Repository } from 'typeorm';
import { canTransitionTable, canWaiterClose, TableState } from '@elo/core';
import type { JwtUser } from '../common/auth-types';
import { TenantRepo } from '../common/tenant-repo';
import { DiningTable, Restaurant, type SessionClosedReason, TableSession } from '../database/entities';
import type { Env } from '../config/env';
import { RealtimeService } from '../realtime/realtime.service';
import { StaffService } from '../staff/staff.service';

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
    private readonly staff: StaffService,
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
    await this.closeSessions(table.id, 'closed');
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

  /**
   * The first waiter to validate wins; anyone else gets 409 `already_handled`
   * with the winner's name instead of a second, conflicting update.
   */
  async validateOpen(rid: string, tableId: string, actor: JwtUser) {
    const table = await this.move(rid, tableId, [TableState.PendingOpen], TableState.Open, { waiterId: staffId(actor) }, (em) =>
      this.stampSession(em, tableId, { openedAt: new Date(), openedBy: staffId(actor) }),
    );
    if (!table) throw await this.lost(rid, tableId);
    return this.persist(table, actor);
  }

  /** The waiter turns down the opening request: the table goes back to closed and the guest session ends. */
  async rejectOpen(rid: string, tableId: string, actor: JwtUser) {
    const table = await this.move(rid, tableId, [TableState.PendingOpen], TableState.Closed, { waiterId: null }, (em) =>
      this.closeSessions(tableId, 'rejected', staffId(actor), em),
    );
    if (!table) throw await this.lost(rid, tableId);
    return this.persist(table, actor);
  }

  /** Only staff close a table; the guest session ends with it. */
  async close(rid: string, tableId: string, actor: JwtUser) {
    const table = await this.move(rid, tableId, [TableState.Open, TableState.PendingClose], TableState.Closed, { waiterId: null }, (em) =>
      this.closeSessions(tableId, 'closed', staffId(actor), em),
    );
    if (!table) throw await this.lost(rid, tableId);
    return this.persist(table, actor);
  }

  /** Another waiter takes over an open table (shift change); they become the one who can cancel its orders. */
  async take(rid: string, tableId: string, actor: JwtUser) {
    const current = await this.get(rid, tableId);
    if (current.waiterId === staffId(actor)) return current;
    const table = await this.move(rid, tableId, [TableState.Open, TableState.PendingClose], null, { waiterId: staffId(actor) });
    if (!table) throw new ConflictException('invalid_table_state');
    return this.persist(table, actor);
  }

  /** Adds the full name of the waiter serving each table, for the staff panels. */
  async withWaiterNames(rows: DiningTable[]) {
    const names = await this.staff.names(rows.map((t) => t.waiterId));
    return rows.map((t) => ({ ...t, waiterName: names.get(t.waiterId ?? '')?.name ?? null }));
  }

  /** Guest-facing name of the waiter serving the table, if any. */
  async waiterNameOf(table: DiningTable): Promise<string | null> {
    return (await this.staff.names([table.waiterId])).get(table.waiterId ?? '')?.guestName ?? null;
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
      await this.closeSessions(table.id, 'taken_over');
    }
    const hours = this.config.get('TABLE_SESSION_HOURS', { infer: true });
    const session = await this.sessions.save(
      this.sessions.create({
        restaurantId: restaurant.id,
        tableId: table.id,
        expiresAt: new Date(Date.now() + hours * 3_600_000),
        closedAt: null,
        closedReason: null,
      }),
    );
    return { session, table, restaurant };
  }

  /** Valida o cookie: sessão existe, não expirou, não foi encerrada. */
  async resolveSession(sessionId: string | undefined): Promise<SessionContext> {
    if (!sessionId || !/^[0-9a-f-]{36}$/.test(sessionId)) throw new UnauthorizedException('session_invalid');
    const s = await this.sessions.findOne({ where: { id: sessionId } });
    if (!s) throw new UnauthorizedException('session_invalid');
    // Cada motivo tem seu código: o cliente explica o que aconteceu em vez de dizer só "encerrado".
    if (s.closedAt) throw new UnauthorizedException(`session_${s.closedReason ?? 'closed'}`);
    if (s.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('session_expired');
    return { sessionId: s.id, tableId: s.tableId, restaurantId: s.restaurantId };
  }

  async tableOf(ctx: SessionContext): Promise<DiningTable> {
    return this.get(ctx.restaurantId, ctx.tableId);
  }

  async requestOpen(ctx: SessionContext) {
    const table = await this.move(ctx.restaurantId, ctx.tableId, [TableState.Closed], TableState.PendingOpen);
    if (!table) throw new ConflictException('invalid_table_state');
    await this.sessions.update({ id: ctx.sessionId }, { openRequestedAt: new Date() });
    return this.persist(table);
  }

  async requestClose(ctx: SessionContext) {
    const table = await this.move(ctx.restaurantId, ctx.tableId, [TableState.Open], TableState.PendingClose);
    if (!table) throw new ConflictException('invalid_table_state');
    await this.sessions.update({ id: ctx.sessionId }, { closeRequestedAt: new Date() });
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

  private async closeSessions(tableId: string, reason: SessionClosedReason, closedBy: string | null = null, em?: EntityManager) {
    const repo = em ? em.getRepository(TableSession) : this.sessions;
    await repo.update({ tableId, closedAt: IsNull() }, { closedAt: new Date(), closedReason: reason, closedBy });
  }

  private async stampSession(em: EntityManager, tableId: string, fields: Partial<TableSession>) {
    await em
      .getRepository(TableSession)
      .createQueryBuilder()
      .update()
      .set(fields)
      .where('table_id = :tableId AND closed_at IS NULL AND expires_at > now()', { tableId })
      .execute();
  }

  /**
   * Compare-and-set on the table state: a single UPDATE guarded by the
   * expected states, so two staff members acting at the same instant cannot
   * both succeed. Returns null when the table was no longer in `from`.
   * `to` null keeps the current state and only applies `set`. `alongside`
   * runs in the same transaction, so whoever loses the race only reads the
   * table after the winner's session record is committed.
   */
  private async move(
    rid: string,
    tableId: string,
    from: TableState[],
    to: TableState | null,
    set: Partial<Pick<DiningTable, 'waiterId'>> = {},
    alongside?: (em: EntityManager) => Promise<unknown>,
  ): Promise<DiningTable | null> {
    const allowed = (f: TableState) => !to || canTransitionTable(f, to) || (to === TableState.Closed && canWaiterClose(f));
    if (!from.every(allowed)) throw new Error(`invalid table transition to ${to}`);
    const moved = await this.tables.manager.transaction(async (em) => {
      const result = await em
        .getRepository(DiningTable)
        .update({ id: tableId, restaurantId: rid, state: In(from) }, { ...set, ...(to ? { state: to } : {}) });
      if (!result.affected) return false;
      await alongside?.(em);
      return true;
    });
    const table = await this.get(rid, tableId);
    return moved ? table : null;
  }

  /** 409 for the staff member who lost the race, naming who handled the table first. */
  private async lost(rid: string, tableId: string) {
    const table = await this.get(rid, tableId);
    const last = await this.sessions.findOne({ where: { tableId }, order: { createdAt: 'DESC' } });
    const by = table.state === TableState.Closed ? last?.closedBy : last?.openedBy;
    const name = (await this.staff.names([by])).get(by ?? '')?.name ?? null;
    return new ConflictException({ statusCode: 409, message: 'already_handled', state: table.state, by: name });
  }

  private async persist(table: DiningTable, actor?: JwtUser) {
    const id = actor ? staffId(actor) : null;
    const names = await this.staff.names([table.waiterId, id]);
    this.realtime.publish({
      type: 'table.updated',
      restaurantId: table.restaurantId,
      tableId: table.id,
      payload: {
        id: table.id,
        name: table.name,
        state: table.state,
        waiterId: table.waiterId,
        waiterName: names.get(table.waiterId ?? '')?.guestName ?? null,
        handledBy: id ? { id, name: names.get(id)?.guestName ?? null } : null,
      },
    });
    return table;
  }
}

/** Elo support inside a restaurant panel has no staff row; only real team members are recorded. */
function staffId(actor: JwtUser): string | null {
  return /^[0-9a-f-]{36}$/.test(actor.sub) ? actor.sub : null;
}
