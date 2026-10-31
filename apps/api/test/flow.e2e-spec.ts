import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import sharp from 'sharp';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { createValidationPipe } from '../src/common/validation';
import { RestaurantLifecycleService } from '../src/restaurants/restaurant-lifecycle.service';
import { ActivityCleanupService } from '../src/audit/activity-cleanup.service';

/**
 * Fluxos críticos contra Postgres real (migrations aplicadas).
 * Runs only against DATABASE_URL_TEST (see test/setup-env.ts), never the development database.
 */
const suite = process.env.DATABASE_URL_TEST ? describe : describe.skip;
const SUPERADMIN_KEY = process.env.SUPERADMIN_KEY ?? '';

suite('fluxo da mesa (e2e)', () => {
  let app: INestApplication;
  let url: string;
  const suf = Date.now().toString(36);
  const http = () => request(app.getHttpServer());

  const login = async (username: string, inSlug = slug, password = 'senha12345') =>
    (await http().post(`/auth/restaurants/${inSlug}/login`).send({ username, password })).body.accessToken as string;

  let admin: string, waiter: string, kitchen: string;
  let slug: string, tableId: string, tableToken: string, productId: string, planId: string;
  const today = () => new Date().toISOString().slice(0, 10);

  beforeAll(async () => {
    // The suite signs in far more than the 10/min login limit allows from one address.
    const unlimited: ThrottlerStorage = {
      increment: async () => ({ totalHits: 1, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 }),
    };
    const mod = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(ThrottlerStorage).useValue(unlimited).compile();
    app = mod.createNestApplication<NestExpressApplication>();
    app.use(cookieParser());
    app.useGlobalPipes(createValidationPipe());
    await app.listen(0);
    url = await app.getUrl();

    const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY })).body.accessToken;
    planId = (await http().post('/admin/plans').set('Authorization', `Bearer ${sa}`).send({ name: `Plano ${suf}`, priceCents: 9900, cycleMonths: 1 }).expect(201)).body.id;
    const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const r = await http()
      .post('/admin/restaurants')
      .set('Authorization', `Bearer ${sa}`)
      .send({ name: `E2E ${suf}`, managerName: 'Maria', managerContact: '11999999999', planId, initialDueDate: due, adminUsername: `adm${suf}`, adminPassword: 'senha12345' })
      .expect((res) => {
        if (res.status !== 201) throw new Error(JSON.stringify(res.body));
      });
    slug = r.body.slug;
    admin = await login(`adm${suf}`);
    for (const [u, role] of [['wai', 'waiter'], ['kit', 'kitchen']]) {
      await http().post('/staff').set('Authorization', `Bearer ${admin}`).send({ username: u + suf, password: 'senha12345', name: `Pessoa ${u}`, roles: [role] }).expect(201);
    }
    waiter = await login(`wai${suf}`);
    kitchen = await login(`kit${suf}`);
    const cat = await http().post('/catalog/categories').set('Authorization', `Bearer ${admin}`).send({ name: 'Pizzas' }).expect(201);
    const prod = await http().post('/catalog/products').set('Authorization', `Bearer ${admin}`).send({ categoryId: cat.body.id, name: 'Margherita', priceCents: 4000 }).expect(201);
    productId = prod.body.id;
    const t = await http().post('/tables').set('Authorization', `Bearer ${admin}`).send({ name: 'Mesa 01' }).expect(201);
    tableId = t.body.id;
    tableToken = t.body.token;
  });

  afterAll(async () => {
    await app?.close();
  });

  const cookieOf = (res: request.Response) => (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
  const waitFor = (socket: Socket, event: string) =>
    new Promise<unknown>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout ${event}`)), 5000);
      socket.once(event, (p) => {
        clearTimeout(t);
        resolve(p);
      });
    });

  it('abandoned scan on a closed table does not lock it', async () => {
    const a = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
    const b = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
    // o aparelho que perdeu a mesa recebe o motivo, não um "encerrado" genérico
    const lost = await http().get('/public/session').set('Cookie', cookieOf(a)).expect(401);
    expect(lost.body.message).toBe('session_taken_over');
    await http().post('/public/session/open').set('Cookie', cookieOf(a)).expect(401);
    await http().get('/public/session').set('Cookie', cookieOf(b)).expect(200);
    await http().get('/public/session').expect(401);
  });

  it('session ends with a specific reason: waiter rejects the opening, waiter closes the table', async () => {
    const auth = { Authorization: `Bearer ${waiter}` };
    const a = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
    await http().post('/public/session/open').set('Cookie', cookieOf(a)).expect(201);
    // com a abertura pedida, outro aparelho é bloqueado com conflito, sem derrubar o primeiro
    await http().post(`/public/${slug}/${tableToken}/session`).expect(409);
    await http().get('/public/session').set('Cookie', cookieOf(a)).expect(200);
    await http().post(`/tables/${tableId}/reject-open`).set(auth).expect(201);
    expect((await http().get('/public/session').set('Cookie', cookieOf(a)).expect(401)).body.message).toBe('session_rejected');

    const b = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
    await http().post('/public/session/open').set('Cookie', cookieOf(b)).expect(201);
    await http().post(`/tables/${tableId}/validate-open`).set(auth).expect(201);
    await http().post(`/tables/${tableId}/close`).set(auth).expect(201);
    expect((await http().get('/public/session').set('Cookie', cookieOf(b)).expect(401)).body.message).toBe('session_closed');
  });

  it('rejects invalid token and unvalidated ordering', async () => {
    await http().post(`/public/${slug}/${'a'.repeat(32)}/session`).expect(404);
    const s = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
    await http().post('/public/session/orders').set('Cookie', cookieOf(s)).send({ items: [{ productId, quantity: 1 }] }).expect(400);
  });

  it('open → validate → order (realtime) → kitchen → close ends session', async () => {
    const s = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
    const cookie = cookieOf(s);
    await http().post('/public/session/open').set('Cookie', cookie).expect(201);
    await http().post(`/public/${slug}/${tableToken}/session`).expect(409);
    await http().post('/public/session/orders').set('Cookie', cookie).send({ items: [{ productId, quantity: 1 }] }).expect(400);
    await http().post(`/tables/${tableId}/validate-open`).set('Authorization', `Bearer ${kitchen}`).expect(403);
    await http().post(`/tables/${tableId}/validate-open`).set('Authorization', `Bearer ${waiter}`).expect(201);

    const kitchenSocket = io(url, { auth: { token: kitchen }, transports: ['websocket'] });
    const customerSocket = io(url, { extraHeaders: { cookie }, transports: ['websocket'] });
    const anon = io(url, { transports: ['websocket'] });
    await Promise.all([waitFor(kitchenSocket, 'connect'), waitFor(customerSocket, 'connect'), waitFor(anon, 'disconnect')]);
    await new Promise((r) => setTimeout(r, 200));

    const created = waitFor(kitchenSocket, 'order.created');
    const order = await http().post('/public/session/orders').set('Cookie', cookie).send({ items: [{ productId, quantity: 2 }] }).expect(201);
    expect((await created as { tableName: string }).tableName).toBe('Mesa 01');

    await http().patch(`/orders/${order.body.id}/status`).set('Authorization', `Bearer ${kitchen}`).send({ status: 'ready' }).expect(409);
    const updated = waitFor(customerSocket, 'order.updated');
    await http().patch(`/orders/${order.body.id}/status`).set('Authorization', `Bearer ${kitchen}`).send({ status: 'received' }).expect(200);
    expect(((await updated) as { status: string }).status).toBe('received');

    // the bill waits for the kitchen: no asking for it while an order is still being made
    expect((await http().post('/public/session/close').set('Cookie', cookie).expect(409)).body.message).toBe('orders_in_progress');
    for (const status of ['preparing', 'ready']) {
      await http().patch(`/orders/${order.body.id}/status`).set('Authorization', `Bearer ${kitchen}`).send({ status }).expect(200);
    }
    await http().post('/public/session/close').set('Cookie', cookie).expect(201);
    await http().post(`/tables/${tableId}/close`).set('Authorization', `Bearer ${kitchen}`).expect(403);
    await http().post(`/tables/${tableId}/close`).set('Authorization', `Bearer ${waiter}`).expect(201);
    await http().get('/public/session').set('Cookie', cookie).expect(401);

    kitchenSocket.close();
    customerSocket.close();
    anon.close();
  });

  it('realtime: refused sockets are told why, and a reconnected socket gets events again', async () => {
    const expired = app.get(JwtService).sign({ sub: 'x', role: 'waiter', restaurantId: null, permissions: [] }, { expiresIn: -10 });
    for (const [opts, reason] of [
      [{ auth: { token: expired } }, 'expired'],
      [{ auth: { token: 'garbage' } }, 'invalid'],
      [{}, 'session'],
    ] as const) {
      const s = io(url, { ...opts, transports: ['websocket'], reconnection: false });
      expect(await waitFor(s, 'auth_error')).toBe(reason);
      s.close();
    }

    const staff = io(url, { auth: { token: waiter }, transports: ['websocket'] });
    await waitFor(staff, 'connect');
    staff.disconnect();
    staff.connect();
    await waitFor(staff, 'connect');
    await new Promise((r) => setTimeout(r, 200));
    const updated = waitFor(staff, 'table.updated');
    await http().post(`/public/${slug}/${tableToken}/session`).then((s) => http().post('/public/session/open').set('Cookie', cookieOf(s)).expect(201));
    expect(((await updated) as { state: string }).state).toBe('pending_open');
    await http().post(`/tables/${tableId}/reject-open`).set('Authorization', `Bearer ${waiter}`).expect(201);
    staff.close();
  });

  it('waiter cancel needs reason and own table; customer cannot cancel in preparation', async () => {
    const s = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
    const cookie = cookieOf(s);
    await http().post('/public/session/open').set('Cookie', cookie).expect(201);
    await http().post(`/tables/${tableId}/validate-open`).set('Authorization', `Bearer ${waiter}`).expect(201);
    const order = await http().post('/public/session/orders').set('Cookie', cookie).send({ items: [{ productId, quantity: 1 }] }).expect(201);
    for (const status of ['received', 'preparing']) {
      await http().patch(`/orders/${order.body.id}/status`).set('Authorization', `Bearer ${kitchen}`).send({ status }).expect(200);
    }
    await http().post(`/public/session/orders/${order.body.id}/cancel`).set('Cookie', cookie).send({}).expect(403);
    await http().post(`/orders/${order.body.id}/cancel`).set('Authorization', `Bearer ${waiter}`).send({ reason: '' }).expect(400);
    await http().post(`/orders/${order.body.id}/cancel`).set('Authorization', `Bearer ${waiter}`).send({ reason: 'cliente desistiu' }).expect(201);
    await http().post(`/tables/${tableId}/close`).set('Authorization', `Bearer ${waiter}`).expect(201);
  });

  it('bill: fee refusal, adjustments, return after ready, reports, deactivation, tenant isolation', async () => {
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    await http().post('/staff').set(auth(admin)).send({ username: 'cax' + suf, password: 'senha12345', name: 'Caio Caixa', roles: ['cashier'] }).expect(201);
    const cashier = await login(`cax${suf}`);

    const s = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
    const cookie = cookieOf(s);
    await http().post('/public/session/open').set('Cookie', cookie).expect(201);
    await http().post(`/tables/${tableId}/validate-open`).set(auth(waiter)).expect(201);
    const o1 = await http().post('/public/session/orders').set('Cookie', cookie).send({ items: [{ productId, quantity: 2 }] }).expect(201);
    const o2 = await http().post('/public/session/orders').set('Cookie', cookie).send({ items: [{ productId, quantity: 1 }] }).expect(201);

    // 3 x R$ 40,00 + 10% de serviço
    let bill = (await http().get(`/bills/${tableId}`).set(auth(cashier)).expect(200)).body;
    expect(bill).toMatchObject({ subtotalCents: 12000, serviceFeeCents: 1200, totalCents: 13200, feeWaivedBy: null });
    await http().get(`/bills/${tableId}`).set(auth(kitchen)).expect(403);

    // cliente recusa a taxa; só desfaz a própria recusa
    bill = (await http().post('/public/session/bill/fee').set('Cookie', cookie).send({ refuse: true }).expect(201)).body;
    expect(bill).toMatchObject({ feeWaivedBy: 'customer', serviceFeeCents: 0, totalCents: 12000 });
    bill = (await http().post('/public/session/bill/fee').set('Cookie', cookie).send({ refuse: false }).expect(201)).body;
    expect(bill).toMatchObject({ feeWaivedBy: null, guestCanRefuseFee: true });
    // the restaurant can take that option away from guests; staff still remove the fee
    const me = (await http().get('/restaurant/me').set(auth(admin)).expect(200)).body;
    const settings = { name: me.name, managerName: me.managerName, managerContact: me.managerContact, serviceFeeBps: me.serviceFeeBps };
    await http().patch('/restaurant/settings').set(auth(admin)).send({ ...settings, guestFeeRefusal: false }).expect(200);
    expect((await http().get('/public/session/bill').set('Cookie', cookie).expect(200)).body.guestCanRefuseFee).toBe(false);
    expect((await http().post('/public/session/bill/fee').set('Cookie', cookie).send({ refuse: true }).expect(403)).body.message).toBe('fee_refusal_disabled');
    await http().patch('/restaurant/settings').set(auth(admin)).send({ ...settings, guestFeeRefusal: true }).expect(200);
    await http().put(`/bills/${tableId}/fee`).set(auth(waiter)).send({ waived: true }).expect(200);
    bill = (await http().post('/public/session/bill/fee').set('Cookie', cookie).send({ refuse: false }).expect(201)).body;
    expect(bill.feeWaivedBy).toBe('staff'); // cliente não desfaz remoção do garçom
    await http().put(`/bills/${tableId}/fee`).set(auth(cashier)).send({ waived: false }).expect(200);

    // ajuste do caixa
    bill = (await http().post(`/bills/${tableId}/adjustments`).set(auth(cashier)).send({ label: 'Cortesia', cents: -500 }).expect(201)).body;
    expect(bill.totalCents).toBe(12700);
    await http().post(`/bills/${tableId}/adjustments`).set(auth(cashier)).send({ label: 'Zero', cents: 0 }).expect(400);
    bill = (await http().delete(`/bills/${tableId}/adjustments/0`).set(auth(cashier)).expect(200)).body;
    expect(bill.totalCents).toBe(13200);

    // cancelado sai da conta; devolução só depois de "pronto"
    for (const status of ['received', 'preparing', 'ready']) {
      await http().patch(`/orders/${o1.body.id}/status`).set(auth(kitchen)).send({ status }).expect(200);
    }
    await http().post(`/orders/${o1.body.id}/cancel`).set(auth(waiter)).send({ reason: 'motivo valido' }).expect(403);
    await http().post(`/orders/${o2.body.id}/return`).set(auth(waiter)).send({ reason: 'motivo valido' }).expect(403); // ainda não está pronto
    await http().post(`/orders/${o1.body.id}/return`).set(auth(waiter)).send({ reason: '' }).expect(400);
    await http().post(`/orders/${o1.body.id}/return`).set(auth(kitchen)).send({ reason: 'motivo valido' }).expect(403);
    const ret = await http().post(`/orders/${o1.body.id}/return`).set(auth(waiter)).send({ reason: 'frio demais' }).expect(201);
    expect(ret.body.status).toBe('returned');
    bill = (await http().get(`/bills/${tableId}`).set(auth(cashier)).expect(200)).body;
    expect(bill.subtotalCents).toBe(4000);

    // lista de pedidos: filtro validado e estado "returned" visível
    await http().get('/orders?status=banana').set(auth(kitchen)).expect(400);
    const listed = await http().get('/orders?status=returned,sent&limit=10').set(auth(kitchen)).expect(200);
    expect(listed.body.map((o: { id: string }) => o.id)).toContain(o1.body.id);

    // relatórios: só admin; devolvido não conta como receita
    await http().get('/reports').set(auth(waiter)).expect(403);
    await http().get('/reports?from=2026-13-99').set(auth(admin)).expect(400);
    const rep = (await http().get('/reports').set(auth(admin)).expect(200)).body;
    expect(rep.totals.returned).toBeGreaterThanOrEqual(1);
    expect(rep.totals.revenueCents).toBeGreaterThanOrEqual(4000);
    expect(rep.byHour).toHaveLength(24);
    expect(rep.topProducts[0].name).toBe('Margherita');

    // outro restaurante não enxerga nada disto
    const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY })).body.accessToken;
    const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const outro = await http().post('/admin/restaurants').set(auth(sa)).send({ name: `Outro ${suf}`, managerName: 'Joao', managerContact: '11988888888', planId, initialDueDate: due, adminUsername: `out${suf}`, adminPassword: 'senha12345' }).expect(201);
    const other = await login(`out${suf}`, outro.body.slug);

    // login é por restaurante: usuário de um não entra no outro, e o mesmo nome pode existir nos dois
    await http().post(`/auth/restaurants/${slug}/login`).send({ username: `out${suf}`, password: 'senha12345' }).expect(401);
    await http().post(`/auth/restaurants/${outro.body.slug}/login`).send({ username: `adm${suf}`, password: 'senha12345' }).expect(401);
    await http().post('/auth/restaurants/nao-existe/login').send({ username: `adm${suf}`, password: 'senha12345' }).expect(401);
    await http().post('/auth/team/login').send({ username: `adm${suf}`, password: 'senha12345' }).expect(401);
    await http().post('/staff').set(auth(other)).send({ username: `adm${suf}`, password: 'senha12345', name: 'Outro Garçom', roles: ['waiter'] }).expect(201);
    await http().post('/staff').set(auth(other)).send({ username: `adm${suf}`, password: 'senha12345', name: 'Outro Garçom', roles: ['waiter'] }).expect(409);
    expect(await login(`adm${suf}`, outro.body.slug)).toBeTruthy();
    // acesso da equipe Elo ao restaurante: exige permissão, vale como admin, não mexe em senhas e é auditado
    const eloUser = `elo${suf}`;
    await http().post('/admin/staff').set(auth(sa)).send({ username: eloUser, name: 'Equipe Elo', password: 'senha12345', permissions: ['restaurants.view'] }).expect(201);
    const eloToken = (await http().post('/auth/team/login').send({ username: eloUser, password: 'senha12345' }).expect(201)).body.accessToken;
    const rid = (await http().get('/restaurant/me').set(auth(admin)).expect(200)).body.id;
    await http().post(`/admin/restaurants/${rid}/access`).set(auth(eloToken)).expect(403);
    const access = await http().post(`/admin/restaurants/${rid}/access`).set(auth(sa)).expect(201);
    expect(access.body.slug).toBe(slug);
    await http().get('/restaurant/me').set(auth(access.body.accessToken)).expect(200);
    await http().get('/tables').set(auth(access.body.accessToken)).expect(200);
    await http().patch('/me/password').set(auth(access.body.accessToken)).send({ current: 'senha12345', next: 'outrasenha123' }).expect(403);
    // the superadmin has no user row and can still record a payment
    await http().post(`/admin/restaurants/${rid}/payments`).set(auth(sa)).send({ cycles: 1, paidAt: today() }).expect(201);
    const paid = (await http().get(`/admin/restaurants/${rid}/payments`).set(auth(sa)).expect(200)).body;
    expect(paid[0]).toMatchObject({ kind: 'payment', amountCents: 9900, recordedByName: 'Superadmin' });
    // slug reservado não vira restaurante
    await http().post('/admin/restaurants').set(auth(sa)).send({ name: 'Admin', managerName: 'Joao', managerContact: '11988888888', planId, initialDueDate: due, adminUsername: `res${suf}`, adminPassword: 'senha12345' }).expect(409);
    await http().get(`/bills/${tableId}`).set(auth(other)).expect(404);
    const otherRep = (await http().get('/reports').set(auth(other)).expect(200)).body;
    expect(otherRep.totals).toMatchObject({ revenueCents: 0, orders: 0, returned: 0 });
    expect((await http().get('/orders').set(auth(other)).expect(200)).body).toEqual([]);

    // configurações: slug não muda; taxa limitada
    await http().patch('/restaurant/settings').set(auth(admin)).send({ name: 'Novo nome', managerName: 'Maria', managerContact: '11999999999', serviceFeeBps: 5000 }).expect(400);
    const st = await http().patch('/restaurant/settings').set(auth(admin)).send({ name: 'Novo nome', managerName: 'Maria', managerContact: '11999999999', serviceFeeBps: 500 }).expect(200);
    expect(st.body).toMatchObject({ slug, name: 'Novo nome', serviceFeeBps: 500 });
    await http().patch('/restaurant/settings').set(auth(admin)).send({ name: 'x', slug: 'hack', managerName: 'Maria', managerContact: '11999999999', serviceFeeBps: 500 }).expect(400);

    // troca de senha e usuário desativado perde o acesso
    await http().patch('/me/password').set(auth(cashier)).send({ current: 'errada1234', next: 'novasenha123' }).expect(401);
    await http().patch('/me/password').set(auth(cashier)).send({ current: 'senha12345', next: 'novasenha123' }).expect(204);
    await http().post(`/auth/restaurants/${slug}/login`).send({ username: `cax${suf}`, password: 'novasenha123' }).expect(201);
    const staff = (await http().get('/staff').set(auth(admin)).expect(200)).body as { id: string; username: string }[];
    const cashierId = staff.find((u) => u.username === `cax${suf}`)!.id;
    await http().patch(`/staff/${cashierId}/active`).set(auth(admin)).send({ active: false }).expect(200);
    await http().get(`/bills/${tableId}`).set(auth(cashier)).expect(401);

    await http().post(`/tables/${tableId}/close`).set(auth(waiter)).expect(201);
  }, 30_000);

  it('banco de imagens: valida o conteúdo, converte, serve e protege o que está em uso', async () => {
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const png = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#2e7d32' } }).png().toBuffer();

    // só o administrador envia; arquivo falso com extensão de imagem é recusado
    await http().post('/catalog/media').set(auth(waiter)).attach('file', png, 'a.png').expect(403);
    await http().post('/catalog/media').set(auth(admin)).attach('file', Buffer.from('isto não é uma imagem'), 'falso.png').expect(400);
    await http().post('/catalog/media').set(auth(admin)).expect(400);
    await http().post('/catalog/media').set(auth(admin)).attach('file', Buffer.alloc(5 * 1024 * 1024 + 10), 'grande.png').expect(413);

    const up = await http().post('/catalog/media').set(auth(admin)).attach('file', png, 'prato.png').expect(201);
    expect(up.body).toMatchObject({ width: 1200, height: 675 });
    const main = await http().get(up.body.url.replace('/api', '')).expect(200);
    expect(main.headers['content-type']).toContain('image/webp');
    const thumb = await http().get(up.body.thumbUrl.replace('/api', '')).expect(200);
    expect(thumb.headers['content-type']).toContain('image/webp');
    await http().get('/media/..%2F..%2Fpackage.json').expect(404);
    await http().get(`/media/${'0'.repeat(8)}-0000-0000-0000-${'0'.repeat(12)}.webp`).expect(404);
    expect((await http().get('/catalog/media').set(auth(admin)).expect(200)).body.map((m: { id: string }) => m.id)).toContain(up.body.id);

    // produto usa a imagem do banco; em uso, não apaga
    const cat = await http().post('/catalog/categories').set(auth(admin)).send({ name: 'Com foto' }).expect(201);
    const prod = await http().post('/catalog/products').set(auth(admin)).send({ categoryId: cat.body.id, name: 'Prato', priceCents: 1000, imageUrl: up.body.url }).expect(201);
    await http().post('/catalog/products').set(auth(admin)).send({ categoryId: cat.body.id, name: 'Ruim', priceCents: 1000, imageUrl: 'javascript:alert(1)' }).expect(400);
    await http().delete(`/catalog/media/${up.body.id}`).set(auth(admin)).expect(409);
    await http().delete(`/catalog/products/${prod.body.id}`).set(auth(admin)).expect(204);
    await http().delete(`/catalog/media/${up.body.id}`).set(auth(admin)).expect(204);
    await http().get(up.body.url.replace('/api', '')).expect(404);
  }, 30_000);

  it('perfil público, etiquetas, ordem e avaliação', async () => {
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const base = { name: 'Perfil', managerName: 'Maria', managerContact: '11999999999', serviceFeeBps: 500 };

    // perfil: valida o formato e aceita limpar com texto vazio
    await http().patch('/restaurant/settings').set(auth(admin)).send({ ...base, phone: 'abc' }).expect(400);
    await http().patch('/restaurant/settings').set(auth(admin)).send({ ...base, instagram: 'com espaço' }).expect(400);
    await http().patch('/restaurant/settings').set(auth(admin)).send({ ...base, logoUrl: 'javascript:alert(1)' }).expect(400);
    await http().patch('/restaurant/settings').set(auth(admin)).send({ ...base, openingHours: [null, null] }).expect(400);
    await http().patch('/restaurant/settings').set(auth(admin)).send({ ...base, openingHours: [null, { open: '25:00', close: '23:00' }, null, null, null, null, null] }).expect(400);
    // same open and close time: a shift around the clock
    const day = { open: '00:00', close: '00:00' };
    const saved = await http().patch('/restaurant/settings').set(auth(admin)).send({
      ...base,
      description: 'Pizzas no forno a lenha.',
      address: 'Rua das Flores, 100',
      phone: '(11) 4000-1234',
      instagram: '@casaverde',
      wifiName: 'Casa Verde',
      wifiPassword: 'segredo-wifi-123',
      openingHours: [day, day, day, day, day, day, day],
    }).expect(200);
    expect(saved.body).toMatchObject({ description: 'Pizzas no forno a lenha.', wifiName: 'Casa Verde', availability: { open: true, reason: null } });

    // consulta pública mostra o perfil, mas nunca o Wi-Fi
    const pub = await http().get(`/public/${slug}/menu`).expect(200);
    expect(pub.body.restaurant).toMatchObject({ description: 'Pizzas no forno a lenha.', phone: '(11) 4000-1234', availability: { open: true } });
    expect(JSON.stringify(pub.body)).not.toContain('segredo-wifi-123');

    // dentro da mesa o Wi-Fi aparece
    const sess = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
    const cookie = (sess.headers['set-cookie'] as unknown as string[]).map((c) => c.split(';')[0]).join('; ');
    expect(sess.body.restaurant.wifi).toEqual({ name: 'Casa Verde', password: 'segredo-wifi-123' });

    // limpar campos
    const cleared = await http().patch('/restaurant/settings').set(auth(admin)).send({ ...base, description: '', phone: null }).expect(200);
    expect(cleared.body).toMatchObject({ description: null, phone: null, address: 'Rua das Flores, 100' });

    // etiquetas e destaque
    const cat = await http().post('/catalog/categories').set(auth(admin)).send({ name: 'Ordem A' }).expect(201);
    const cat2 = await http().post('/catalog/categories').set(auth(admin)).send({ name: 'Ordem B' }).expect(201);
    const p = (name: string, extra: object = {}) =>
      http().post('/catalog/products').set(auth(admin)).send({ categoryId: cat.body.id, name, priceCents: 1000, ...extra });
    await p('Inválido', { tags: ['inexistente'] }).expect(400);
    await p('Repetido', { tags: ['spicy', 'spicy'] }).expect(400);
    const a = (await p('Alfa', { featured: true, tags: ['spicy', 'new'] }).expect(201)).body;
    const b = (await p('Beta').expect(201)).body;
    const c = (await p('Gama').expect(201)).body;
    expect(a).toMatchObject({ featured: true, tags: ['spicy', 'new'] });

    // ordem de produtos: precisa trazer todos, só do restaurante
    await http().patch('/catalog/products/order').set(auth(admin)).send({ categoryId: cat.body.id, ids: [c.id, a.id] }).expect(400);
    await http().patch('/catalog/products/order').set(auth(admin)).send({ categoryId: cat.body.id, ids: [c.id, a.id, 'e1f5b8d0-0000-4000-8000-000000000000'] }).expect(400);
    await http().patch('/catalog/products/order').set(auth(admin)).send({ categoryId: cat.body.id, ids: [c.id, a.id, b.id] }).expect(204);
    const menu = (await http().get('/catalog').set(auth(admin)).expect(200)).body as { id: string; products: { id: string }[] }[];
    expect(menu.find((x) => x.id === cat.body.id)!.products.map((x) => x.id)).toEqual([c.id, a.id, b.id]);

    // ordem de categorias: lista completa
    const all = menu.map((x) => x.id);
    await http().patch('/catalog/categories/order').set(auth(admin)).send({ ids: all.slice(1) }).expect(400);
    const reversed = [...all].reverse();
    await http().patch('/catalog/categories/order').set(auth(admin)).send({ ids: reversed }).expect(204);
    expect(((await http().get('/catalog').set(auth(admin)).expect(200)).body as { id: string }[]).map((x) => x.id)).toEqual(reversed);
    await http().patch('/catalog/products/order').set(auth(waiter)).send({ categoryId: cat.body.id, ids: [a.id] }).expect(403);
    expect(cat2.body.id).toBeTruthy();

    // avaliação: precisa de mesa aberta, 1 a 5, uma por sessão
    await http().post('/public/session/review').set('Cookie', cookie).send({ stars: 5 }).expect(400);
    await http().post('/public/session/open').set('Cookie', cookie).expect(201);
    await http().post(`/tables/${tableId}/validate-open`).set(auth(waiter)).expect(201);
    await http().post('/public/session/review').set('Cookie', cookie).send({ stars: 0 }).expect(400);
    await http().post('/public/session/review').set('Cookie', cookie).send({ stars: 6 }).expect(400);
    await http().post('/public/session/review').send({ stars: 5 }).expect(401);
    await http().post('/public/session/review').set('Cookie', cookie).send({ stars: 4, comment: 'Bom' }).expect(201);
    await http().post('/public/session/review').set('Cookie', cookie).send({ stars: 5, comment: '  Ótimo  ' }).expect(201);
    expect((await http().get('/public/session/review').set('Cookie', cookie).expect(200)).body).toMatchObject({ stars: 5, comment: 'Ótimo' });
    const sum = (await http().get('/reviews').set(auth(admin)).expect(200)).body;
    expect(sum).toMatchObject({ count: 1, average: 5 });
    expect(sum.reviews[0]).toMatchObject({ stars: 5, comment: 'Ótimo', tableName: 'Mesa 01' });
    await http().get('/reviews').set(auth(waiter)).expect(403);
    await http().post(`/tables/${tableId}/close`).set(auth(waiter)).expect(201);
  }, 30_000);

  it('equipe: vários perfis, um só titular, disputa entre garçons, arquivamento e desempenho', async () => {
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const create = (body: Record<string, unknown>) => http().post('/staff').set(auth(admin)).send({ password: 'senha12345', ...body });

    // vários perfis numa pessoa; nome obrigatório
    await create({ username: `sem${suf}`, roles: ['waiter'] }).expect(400);
    await create({ username: `vaz${suf}`, name: 'Sem Perfil', roles: [] }).expect(400);
    await create({ username: `kc${suf}`, name: 'Kátia Cozinha', roles: ['kitchen', 'cashier'] }).expect(201);
    const kc = await login(`kc${suf}`);
    await http().get('/bills').set(auth(kc)).expect(200);
    await http().get('/orders').set(auth(kc)).expect(200);
    await http().get('/staff').set(auth(kc)).expect(403);

    // one owner per restaurant: nobody creates or promotes another administrator, and the owner does not archive themselves
    expect((await create({ username: `ad2${suf}`, name: 'Bruna Gerente', roles: ['restaurant_admin', 'waiter'] }).expect(403)).body.message).toBe('owner');
    const team = (await http().get('/staff').set(auth(admin)).expect(200)).body as { id: string; username: string; name: string; roles: string[] }[];
    const me = team.find((u) => u.username === `adm${suf}`)!;
    const kcId = team.find((u) => u.username === `kc${suf}`)!.id;
    expect((await http().patch(`/staff/${kcId}`).set(auth(admin)).send({ roles: ['restaurant_admin'] }).expect(403)).body.message).toBe('owner');
    await http().delete(`/staff/${me.id}`).set(auth(admin)).expect(403);
    expect(team.find((u) => u.username === `kc${suf}`)).toMatchObject({ name: 'Kátia Cozinha', roles: ['kitchen', 'cashier'] });

    // dois garçons validam a mesma mesa ao mesmo tempo: só um passa, o outro sabe quem foi
    const w2 = (await create({ username: `wb${suf}`, name: 'Ana Lima', displayName: 'Ana', roles: ['waiter'] }).expect(201)).body;
    const waiter2 = await login(`wb${suf}`);
    const sess = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
    const cookie = cookieOf(sess);
    await http().post('/public/session/open').set('Cookie', cookie).expect(201);
    const [r1, r2] = await Promise.all([
      http().post(`/tables/${tableId}/validate-open`).set(auth(waiter2)),
      http().post(`/tables/${tableId}/validate-open`).set(auth(waiter)),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    const loser = r1.status === 409 ? r1 : r2;
    expect(loser.body).toMatchObject({ message: 'already_handled', state: 'open' });
    const winnerIsAna = r1.status === 201;
    expect(loser.body.by).toBe(winnerIsAna ? 'Ana Lima' : 'Pessoa wai');
    const state = (await http().get('/public/session').set('Cookie', cookie).expect(200)).body;
    expect(state.table.waiterName).toBe(winnerIsAna ? 'Ana' : 'Pessoa');

    // chamado: o primeiro a atender leva; o cliente fica sabendo quem vem
    const call = (await http().post('/public/session/call').set('Cookie', cookie).expect(201)).body;
    const guest = io(url, { extraHeaders: { cookie }, transports: ['websocket'] });
    await waitFor(guest, 'connect');
    await new Promise((r) => setTimeout(r, 200));
    const resolved = waitFor(guest, 'call.resolved');
    const [c1, c2] = await Promise.all([
      http().post(`/calls/${call.id}/resolve`).set(auth(waiter2)),
      http().post(`/calls/${call.id}/resolve`).set(auth(waiter)),
    ]);
    expect([c1.status, c2.status].sort()).toEqual([201, 409]);
    const callWinner = c1.status === 201 ? { name: 'Ana Lima', guest: 'Ana' } : { name: 'Pessoa wai', guest: 'Pessoa' };
    expect((c1.status === 409 ? c1 : c2).body).toMatchObject({ message: 'already_handled', by: callWinner.name });
    expect(((await resolved) as { handledBy: { name: string } }).handledBy.name).toBe(callWinner.guest);
    guest.close();

    // cozinha volta um passo marcado por engano
    const order = (await http().post('/public/session/orders').set('Cookie', cookie).send({ items: [{ productId, quantity: 1 }] }).expect(201)).body;
    await http().patch(`/orders/${order.id}/revert`).set(auth(kitchen)).expect(409);
    // the kitchen identifies each order by table, in the list and in every response
    const listed = (await http().get('/orders').set(auth(kitchen)).expect(200)).body as { id: string; tableName: string }[];
    expect(listed.find((o) => o.id === order.id)?.tableName).toBe('Mesa 01');
    await http().patch(`/orders/${order.id}/status`).set(auth(kitchen)).send({ status: 'received' }).expect(200);
    expect((await http().patch(`/orders/${order.id}/status`).set(auth(kitchen)).send({ status: 'preparing' }).expect(200)).body.tableName).toBe('Mesa 01');
    await http().patch(`/orders/${order.id}/revert`).set(auth(waiter)).expect(403);
    expect((await http().patch(`/orders/${order.id}/revert`).set(auth(kitchen)).expect(200)).body.status).toBe('received');
    await http().post(`/public/session/orders/${order.id}/cancel`).set('Cookie', cookie).send({}).expect(201);

    // quem atende uma mesa aberta não pode ser arquivado; outro garçom assume e aí pode
    const servingId = winnerIsAna ? w2.id : team.find((u) => u.username === `wai${suf}`)!.id;
    const other = winnerIsAna ? waiter : waiter2;
    const busy = await http().delete(`/staff/${servingId}`).set(auth(admin)).expect(409);
    expect(busy.body).toMatchObject({ message: 'staff_busy', tables: ['Mesa 01'] });
    await http().post(`/tables/${tableId}/take`).set(auth(other)).expect(201);
    await http().post(`/tables/${tableId}/close`).set(auth(other)).expect(201);

    const rep = (await http().get('/reports/staff').set(auth(admin)).expect(200)).body as { rows: { id: string; tablesOpened: number; tablesClosed: number; callsAnswered: number; avgOpenSeconds: number | null }[] };
    const servingRow = rep.rows.find((r) => r.id === servingId)!;
    expect(servingRow.tablesOpened).toBeGreaterThanOrEqual(1);
    expect(servingRow.avgOpenSeconds).not.toBeNull();
    expect(rep.rows.reduce((n, r) => n + r.callsAnswered, 0)).toBeGreaterThanOrEqual(1);
    await http().get('/reports/staff').set(auth(waiter)).expect(403);

    // arquivado: some da equipe, não entra, o nome de usuário fica livre e o histórico continua
    await http().delete(`/staff/${w2.id}`).set(auth(admin)).expect(204);
    await http().post(`/auth/restaurants/${slug}/login`).send({ username: `wb${suf}`, password: 'senha12345' }).expect(401);
    await http().get('/tables').set(auth(waiter2)).expect(401);
    expect(((await http().get('/staff').set(auth(admin)).expect(200)).body as { id: string }[]).some((u) => u.id === w2.id)).toBe(false);
    await create({ username: `wb${suf}`, name: 'Ana Nova', roles: ['waiter'] }).expect(201);
    if (winnerIsAna) {
      const again = (await http().get('/reports/staff').set(auth(admin)).expect(200)).body as { rows: { id: string; archived: boolean }[] };
      expect(again.rows.find((r) => r.id === w2.id)).toMatchObject({ archived: true });
    }
  }, 30_000);

  it('painel Elo: permissões separadas, lista com filtros e exclusão em duas etapas', async () => {
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY })).body.accessToken as string;
    const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const newRestaurant = (name: string, admin: string) =>
      http().post('/admin/restaurants').set(auth(sa)).send({ name, managerName: 'Rita', managerContact: '11977777777', planId, initialDueDate: due, adminUsername: admin, adminPassword: 'senha12345' }).expect(201);
    const teamLogin = async (username: string) => (await http().post('/auth/team/login').send({ username, password: 'senha12345' }).expect(201)).body.accessToken as string;

    // permissões: cada uma depende de "ver"; ninguém concede o que não tem; excluir só o superadmin concede
    const viewer = (await http().post('/admin/staff').set(auth(sa)).send({ username: `vw${suf}`, name: 'Vera Leitura', password: 'senha12345', permissions: ['payments.record'] }).expect(201)).body;
    expect(viewer.permissions).toEqual(['restaurants.view', 'payments.view', 'payments.record']);
    await http().post('/admin/staff').set(auth(sa)).send({ username: `tm${suf}`, name: 'Tito Equipe', password: 'senha12345', permissions: ['team.manage', 'payments.view', 'restaurants.delete'] }).expect(201);
    const manager = await teamLogin(`tm${suf}`);
    await http().post('/admin/staff').set(auth(manager)).send({ username: `x1${suf}`, name: 'Xis Um', password: 'senha12345', permissions: ['payments.record'] }).expect(403);
    await http().post('/admin/staff').set(auth(manager)).send({ username: `x1${suf}`, name: 'Xis Um', password: 'senha12345', permissions: ['payments.view'] }).expect(201);
    await http().patch(`/admin/staff/${viewer.id}`).set(auth(manager)).send({ permissions: ['restaurants.delete'] }).expect(403);
    const vw = await teamLogin(`vw${suf}`);
    await http().post('/admin/restaurants').set(auth(vw)).send({}).expect(403);
    await http().get('/admin/restaurants?status=deleted').set(auth(vw)).expect(403);
    // tokens emitidos antes da separação continuam valendo pelo que cobriam
    const legacy = app.get(JwtService).sign({ sub: viewer.id, role: 'elo_admin', restaurantId: null, permissions: ['subscriptions'] });
    const any = (await http().get('/admin/restaurants?pageSize=5').set(auth(legacy)).expect(200)).body.items[0].id;
    await http().get(`/admin/restaurants/${any}/payments`).set(auth(legacy)).expect(200);

    // lista: busca, situação, página e contagens
    const a = (await newRestaurant(`Busca ${suf} Alfa`, `ba${suf}`)).body;
    const b = (await newRestaurant(`Busca ${suf} Beta`, `bb${suf}`)).body;
    const found = (await http().get(`/admin/restaurants?q=${encodeURIComponent(`busca ${suf}`)}&pageSize=5`).set(auth(vw)).expect(200)).body;
    expect(found.items.map((r: { slug: string }) => r.slug)).toEqual([a.slug, b.slug]);
    expect(found).toMatchObject({ total: 2, page: 1, pageSize: 5, counts: { all: 2, active: 2, grace: 0, suspended: 0 } });
    expect(found.counts.deleted).toBeUndefined();
    const page2 = (await http().get(`/admin/restaurants?q=${encodeURIComponent(`busca ${suf}`)}&pageSize=5&page=2`).set(auth(vw)).expect(200)).body;
    expect(page2.items).toEqual([]);
    await http().patch(`/admin/restaurants/${a.id}`).set(auth(vw)).send({ name: 'Outro' }).expect(403);
    await http().patch(`/admin/restaurants/${a.id}`).set(auth(sa)).send({ name: `Busca ${suf} Alfa Novo` }).expect(200);

    // exclusão: só suspenso, com o slug digitado; some de tudo; pode voltar; some de vez depois do prazo
    await http().delete(`/admin/restaurants/${b.id}`).set(auth(sa)).send({ confirmSlug: b.slug }).expect(409);
    await http().post(`/admin/restaurants/${b.id}/suspend`).set(auth(sa)).expect(201);
    const suspendedList = (await http().get(`/admin/restaurants?q=${encodeURIComponent(`busca ${suf}`)}&status=suspended`).set(auth(sa)).expect(200)).body;
    expect(suspendedList.items.map((r: { id: string }) => r.id)).toEqual([b.id]);
    await http().delete(`/admin/restaurants/${b.id}`).set(auth(vw)).send({ confirmSlug: b.slug }).expect(403);
    await http().delete(`/admin/restaurants/${b.id}`).set(auth(sa)).send({ confirmSlug: 'errado' }).expect(400);
    await http().delete(`/admin/restaurants/${b.id}`).set(auth(manager)).send({ confirmSlug: b.slug }).expect(204);
    await http().get(`/public/${b.slug}/menu`).expect(404);
    await http().post(`/auth/restaurants/${b.slug}/login`).send({ username: `bb${suf}`, password: 'senha12345' }).expect(401);
    await http().post('/admin/restaurants').set(auth(sa)).send({ name: 'Xis', slug: b.slug, managerName: 'Rita', managerContact: '11977777777', planId, initialDueDate: due, adminUsername: `bz${suf}`, adminPassword: 'senha12345' }).expect(409);
    const afterDelete = (await http().get(`/admin/restaurants?q=${encodeURIComponent(`busca ${suf}`)}`).set(auth(sa)).expect(200)).body;
    expect(afterDelete.items.map((r: { id: string }) => r.id)).toEqual([a.id]);
    expect(afterDelete.counts.deleted).toBe(1);
    const deleted = (await http().get(`/admin/restaurants?q=${encodeURIComponent(`busca ${suf}`)}&status=deleted`).set(auth(sa)).expect(200)).body;
    expect(deleted.items[0]).toMatchObject({ id: b.id });
    expect(Date.parse(deleted.items[0].purgeAt) - Date.parse(deleted.items[0].deletedAt)).toBe(90 * 86_400_000);
    const exported = (await http().get(`/admin/restaurants/${b.id}/export`).set(auth(sa)).expect(200)).body;
    expect(exported.restaurant.slug).toBe(b.slug);
    expect(exported.staff[0].username).toBe(`bb${suf}`);
    expect(exported.staff[0].passwordHash).toBeUndefined();

    const restored = (await http().post(`/admin/restaurants/${b.id}/restore`).set(auth(sa)).expect(201)).body;
    expect(restored).toMatchObject({ id: b.id, suspended: true });
    await http().get(`/public/${b.slug}/menu`).expect(200);
    await http().delete(`/admin/restaurants/${b.id}`).set(auth(sa)).send({ confirmSlug: b.slug }).expect(204);

    const lifecycle = app.get(RestaurantLifecycleService);
    expect(await lifecycle.purgeExpired({ ids: [b.id] })).toEqual([]);
    expect(await lifecycle.purgeExpired({ now: new Date(Date.now() + 91 * 86_400_000), ids: [b.id] })).toEqual([b.id]);
    await http().get(`/admin/restaurants/${b.id}/export`).set(auth(sa)).expect(404);
    const slugFree = await http().post('/admin/restaurants').set(auth(sa)).send({ name: 'Volta', slug: b.slug, managerName: 'Rita', managerContact: '11977777777', planId, initialDueDate: due, adminUsername: `bb${suf}`, adminPassword: 'senha12345' }).expect(201);
    expect(slugFree.body.slug).toBe(b.slug);
  }, 30_000);

  it('registros, validações dos campos e inscrição para push', async () => {
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY })).body.accessToken as string;
    const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const r = (await http().post('/admin/restaurants').set(auth(sa)).send({ name: `Registro ${suf}`, managerName: 'Rita Souza', managerContact: '(11) 97777-7777', planId, initialDueDate: due, adminUsername: `rg${suf}`, adminPassword: 'senha12345' }).expect(201)).body;
    const owner = await login(`rg${suf}`, r.slug);

    // campos validados e normalizados com as mesmas regras do formulário
    const base = { name: 'Registro', managerName: 'Rita Souza', managerContact: '11977777777', serviceFeeBps: 1000 };
    await http().patch('/restaurant/settings').set(auth(owner)).send({ ...base, serviceFeeBps: 2500 }).expect(400);
    await http().patch('/restaurant/settings').set(auth(owner)).send({ ...base, managerContact: '1234' }).expect(400);
    await http().patch('/restaurant/settings').set(auth(owner)).send({ ...base, managerName: 'Rita 123' }).expect(400);
    await http().patch('/restaurant/settings').set(auth(owner)).send({ ...base, phone: '11 8123-45' }).expect(400);
    const saved = (await http().patch('/restaurant/settings').set(auth(owner)).send({ ...base, phone: '+55 11 4000 1234', instagram: 'https://instagram.com/Casa.Registro/' }).expect(200)).body;
    expect(saved).toMatchObject({ managerContact: '(11) 97777-7777', phone: '(11) 4000-1234', instagram: 'casa.registro' });
    expect((await http().patch('/restaurant/settings').set(auth(owner)).send({ ...base, phone: '', instagram: '' }).expect(200)).body).toMatchObject({ phone: null, instagram: null });

    // ações da equipe e da Elo ficam registradas, com nome e origem
    await http().post('/tables').set(auth(owner)).send({ name: 'Mesa 9' }).expect(201);
    await http().post('/staff').set(auth(owner)).send({ username: `rgw${suf}`, password: 'senha12345', name: 'Gabi Garçom', roles: ['waiter'] }).expect(201);
    await http().post(`/admin/restaurants/${r.id}/payments`).set(auth(sa)).send({ cycles: 1, paidAt: today(), amountCents: 4990, note: 'Desconto de lançamento' }).expect(201);
    await http().post(`/admin/restaurants/${r.id}/access`).set(auth(sa)).expect(201);
    const log = (await http().get('/restaurant/activity').set(auth(owner)).expect(200)).body as { total: number; items: { action: string; actorName: string; actorKind: string; target: string | null; meta: Record<string, unknown> | null }[] };
    const byAction = (a: string) => log.items.find((i) => i.action === a);
    expect(byAction('table_created')).toMatchObject({ actorName: 'Rita Souza', actorKind: 'staff', target: 'Mesa 9' });
    expect(byAction('staff_created')).toMatchObject({ target: 'Gabi Garçom', meta: { roles: ['waiter'] } });
    expect(byAction('settings_updated')?.meta).toMatchObject({ fields: expect.arrayContaining(['phone', 'instagram']) });
    expect(JSON.stringify(log)).not.toContain('4000-1234');
    expect(byAction('payment_recorded')).toMatchObject({ actorName: 'Superadmin', actorKind: 'elo', meta: { amountCents: 4990 } });
    expect(byAction('restaurant_access')).toMatchObject({ actorKind: 'elo' });
    const team = (await http().get('/restaurant/activity?category=team').set(auth(owner)).expect(200)).body;
    expect(team.items.every((i: { action: string }) => i.action.startsWith('staff_'))).toBe(true);
    await http().get('/restaurant/activity?category=nada').set(auth(owner)).expect(400);
    const waiterTok = await login(`rgw${suf}`, r.slug);
    await http().get('/restaurant/activity').set(auth(waiterTok)).expect(403);
    await http().get(`/admin/restaurants/${r.id}/activity`).set(auth(sa)).expect(200);
    const outsider = (await http().post('/admin/staff').set(auth(sa)).send({ username: `ou${suf}`, name: 'Otto Leitura', password: 'senha12345', permissions: ['restaurants.view'] }).expect(201)).body;
    expect(outsider.permissions).toEqual(['restaurants.view']);
    const out = (await http().post('/auth/team/login').send({ username: `ou${suf}`, password: 'senha12345' }).expect(201)).body.accessToken;
    await http().get(`/admin/restaurants/${r.id}/activity`).set(auth(out)).expect(403);

    // push: chave pública (vazia sem configuração), só endpoint https, uma linha por aparelho
    expect((await http().get('/push/public-key').set(auth(waiterTok)).expect(200)).body).toHaveProperty('key');
    const keys = { p256dh: 'BOr' + 'a'.repeat(84), auth: 'b'.repeat(22) };
    await http().post('/push/subscriptions').set(auth(waiterTok)).send({ endpoint: 'http://push.example/x', keys }).expect(400);
    // the server posts to the endpoint: only the browsers' push services are accepted
    await http().post('/push/subscriptions').set(auth(waiterTok)).send({ endpoint: 'https://169.254.169.254/latest', keys }).expect(400);
    await http().post('/push/subscriptions').set(auth(waiterTok)).send({ endpoint: `https://fcm.googleapis.com/fcm/send/${suf}`, keys }).expect(204);
    await http().post('/push/subscriptions').set(auth(owner)).send({ endpoint: `https://fcm.googleapis.com/fcm/send/${suf}`, keys }).expect(204);
    const access = (await http().post(`/admin/restaurants/${r.id}/access`).set(auth(sa)).expect(201)).body.accessToken;
    await http().post('/push/subscriptions').set(auth(access)).send({ endpoint: `https://fcm.googleapis.com/fcm/send/elo${suf}`, keys }).expect(403);
    await http().delete('/push/subscriptions').set(auth(owner)).send({ endpoint: `https://fcm.googleapis.com/fcm/send/${suf}` }).expect(204);
  }, 30_000);
  it('assinatura: planos, pagamento calculado, estorno, ajuste de vencimento e modo suporte', async () => {
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY })).body.accessToken as string;
    const dayFrom = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
    const addMonth = (d: string) => {
      const [y, m, dd] = d.split('-').map(Number);
      const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      return new Date(Date.UTC(y, m, Math.min(dd, last))).toISOString().slice(0, 10);
    };

    // trial ended a month ago: suspended for being overdue, and "reactivate" alone does not fix it
    const r = (await http().post('/admin/restaurants').set(auth(sa)).send({ name: `Cobranca ${suf}`, managerName: 'Rita', managerContact: '11977777777', planId, initialDueDate: dayFrom(-30), adminUsername: `cb${suf}`, adminPassword: 'senha12345' }).expect(201)).body;
    const detail = async () => (await http().get(`/admin/restaurants/${r.id}`).set(auth(sa)).expect(200)).body;
    expect((await detail()).subscription).toMatchObject({ state: 'suspended', reasons: ['overdue'], plan: { id: planId, priceCents: 9900 } });

    // the period restarts on the payment day and the amount comes from the plan
    const preview = (await http().get(`/admin/restaurants/${r.id}/payments/preview?cycles=1&paidAt=${dayFrom(0)}`).set(auth(sa)).expect(200)).body;
    expect(preview).toMatchObject({ expectedCents: 9900, restartsFromPayment: true });
    expect(preview.periodStart.slice(0, 10)).toBe(dayFrom(0));
    const bad = await http().post(`/admin/restaurants/${r.id}/payments`).set(auth(sa)).send({ cycles: 1, paidAt: dayFrom(0), amountCents: 5000 }).expect(400);
    expect(bad.body.problems).toEqual(['note_required']);
    await http().post(`/admin/restaurants/${r.id}/payments`).set(auth(sa)).send({ cycles: 1, paidAt: dayFrom(2) }).expect(400);
    const pay = (await http().post(`/admin/restaurants/${r.id}/payments`).set(auth(sa)).send({ cycles: 1, paidAt: dayFrom(0) }).expect(201)).body;
    expect(pay.newDueDate.slice(0, 10)).toBe(addMonth(dayFrom(0)));
    expect((await detail()).subscription).toMatchObject({ state: 'active', reasons: [] });

    // a manual due date needs a reason and a day that has not passed
    await http().post(`/admin/restaurants/${r.id}/due-date`).set(auth(sa)).send({ dueDate: dayFrom(-1), reason: 'Teste' }).expect(400);
    const adjusted = (await http().post(`/admin/restaurants/${r.id}/due-date`).set(auth(sa)).send({ dueDate: dayFrom(90), reason: 'Cortesia de lançamento' }).expect(201)).body;
    expect((await detail()).subscription.dueDate.slice(0, 10)).toBe(dayFrom(90));

    // only the latest entry is voided, and the due date steps back each time
    await http().post(`/admin/restaurants/${r.id}/payments/${pay.id}/void`).set(auth(sa)).send({ reason: 'Teste' }).expect(409);
    await http().post(`/admin/restaurants/${r.id}/payments/${adjusted.id}/void`).set(auth(sa)).send({ reason: 'Engano' }).expect(201);
    expect((await detail()).subscription.dueDate.slice(0, 10)).toBe(addMonth(dayFrom(0)));
    await http().patch(`/admin/restaurants/${r.id}/payments/${pay.id}`).set(auth(sa)).send({ amountCents: 9000, note: 'Desconto combinado' }).expect(200);
    await http().post(`/admin/restaurants/${r.id}/payments/${pay.id}/void`).set(auth(sa)).send({ reason: 'Pagamento não compensou' }).expect(201);
    expect((await detail()).subscription.state).toBe('suspended');
    const history = (await http().get(`/admin/restaurants/${r.id}/payments`).set(auth(sa)).expect(200)).body as { voidedAt: string | null; voidReason: string | null }[];
    expect(history.every((h) => h.voidedAt)).toBe(true);
    const log = (await http().get(`/admin/restaurants/${r.id}/activity?category=payments`).set(auth(sa)).expect(200)).body as { items: { action: string }[] };
    expect(log.items.map((i) => i.action)).toEqual(expect.arrayContaining(['payment_recorded', 'payment_edited', 'payment_voided', 'due_date_adjusted']));

    // a plan in use is never deleted; a deactivated one takes no new restaurants
    await http().delete(`/admin/plans/${planId}`).set(auth(sa)).expect(409);
    const spare = (await http().post('/admin/plans').set(auth(sa)).send({ name: `Avulso ${suf}`, priceCents: 1000, cycleMonths: 1 }).expect(201)).body;
    await http().patch(`/admin/plans/${spare.id}`).set(auth(sa)).send({ active: false }).expect(200);
    await http().post('/admin/restaurants').set(auth(sa)).send({ name: `Inativo ${suf}`, managerName: 'Rita', managerContact: '11977777777', planId: spare.id, initialDueDate: dayFrom(10), adminUsername: `in${suf}`, adminPassword: 'senha12345' }).expect(409);
    await http().delete(`/admin/plans/${spare.id}`).set(auth(sa)).expect(204);

    // Elo support inside the panel: watches the operation, fixes configuration and passwords
    const rid = (await http().get('/restaurant/me').set(auth(admin)).expect(200)).body.id;
    const support = (await http().post(`/admin/restaurants/${rid}/access`).set(auth(sa)).expect(201)).body.accessToken as string;
    const anyId = '00000000-0000-4000-8000-000000000000';
    await http().get('/orders').set(auth(support)).expect(200);
    await http().post(`/orders/${anyId}/cancel`).set(auth(support)).send({ reason: 'Teste' }).expect(403);
    await http().post(`/orders/${anyId}/return`).set(auth(support)).send({ reason: 'Teste' }).expect(403);
    await http().post(`/calls/${anyId}/resolve`).set(auth(support)).expect(403);
    await http().put(`/bills/${anyId}/fee`).set(auth(support)).send({ waived: true }).expect(403);
    const table = (await http().post('/tables').set(auth(support)).send({ name: `Suporte ${suf}` }).expect(201)).body;
    await http().delete(`/tables/${table.id}`).set(auth(support)).expect(204);
    const team = (await http().get('/staff').set(auth(support)).expect(200)).body as { id: string; username: string }[];
    const owner = team.find((m) => m.username === `adm${suf}`)!;
    await http().patch(`/staff/${owner.id}/password`).set(auth(support)).send({ password: 'senha12345' }).expect(204);
    // the kitchen status belongs to the kitchen, not to the administrator
    await http().patch(`/orders/${anyId}/revert`).set(auth(admin)).expect(403);
    await http().patch(`/orders/${anyId}/status`).set(auth(admin)).send({ status: 'received' }).expect(403);
  });
  it('perfis trocados valem na hora e o painel recebe um token novo sem entrar de novo', async () => {
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const member = (await http().post('/staff').set(auth(admin)).send({ username: `pf${suf}`, password: 'senha12345', name: 'Paula Fernandes', roles: ['waiter'] }).expect(201)).body;
    const before = await login(`pf${suf}`);
    await http().get('/calls').set(auth(before)).expect(200);
    await http().patch(`/staff/${member.id}`).set(auth(admin)).send({ roles: ['kitchen'] }).expect(200);
    // the old token already carries the new roles on the server
    await http().get('/calls').set(auth(before)).expect(403);
    await http().get('/orders').set(auth(before)).expect(200);
    const fresh = (await http().post('/auth/refresh').set(auth(before)).expect(201)).body.accessToken as string;
    const claims = JSON.parse(Buffer.from(fresh.split('.')[1], 'base64url').toString());
    const old = JSON.parse(Buffer.from(before.split('.')[1], 'base64url').toString());
    expect(claims).toMatchObject({ sub: member.id, roles: ['kitchen'], exp: old.exp });
    // answering calls is the waiters' job, and the floor only lists orders of tables still in use
    await http().post(`/calls/00000000-0000-4000-8000-000000000000/resolve`).set(auth(admin)).expect(403);
    await http().get('/orders?open=true&status=ready').set(auth(admin)).expect(200);
  });
  it('cliente: avisos só com a mesa aberta, e o aparelho é esquecido quando a mesa fecha', async () => {
    const auth = { Authorization: `Bearer ${waiter}` };
    const db = app.get(DataSource);
    const count = async () => Number((await db.query(`SELECT COUNT(*) AS n FROM guest_push_subscriptions WHERE table_id = $1`, [tableId]))[0].n);
    const device = { endpoint: `https://fcm.googleapis.com/fcm/send/guest-${suf}`, keys: { p256dh: 'BOr6fJp5q0q3mWJZ2zKj8yG', auth: 'c2VjcmV0' } };

    await http().get('/public/push-key').expect(200);
    const g = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
    await http().post('/public/session/push').set('Cookie', cookieOf(g)).send(device).expect(409);
    await http().post('/public/session/open').set('Cookie', cookieOf(g)).expect(201);
    await http().post(`/tables/${tableId}/validate-open`).set(auth).expect(201);
    await http().post('/public/session/push').set('Cookie', cookieOf(g)).send({ ...device, endpoint: 'http://insecure.example.com/x' }).expect(400);
    await http().post('/public/session/push').set('Cookie', cookieOf(g)).send(device).expect(204);
    expect(await count()).toBe(1);

    await http().post(`/tables/${tableId}/close`).set(auth).expect(201);
    for (let i = 0; i < 20 && (await count()) > 0; i++) await new Promise((r) => setTimeout(r, 50));
    expect(await count()).toBe(0);
  });
  it('gerente: cuida do dia a dia e da equipe operacional, sem configurações nem administradores', async () => {
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    await http().post('/staff').set(auth(admin)).send({ username: `gr${suf}`, password: 'senha12345', name: 'Gerson Ramos', roles: ['manager'] }).expect(201);
    const manager = await login(`gr${suf}`);
    await http().get('/reports').set(auth(manager)).expect(200);
    await http().get('/restaurant/activity').set(auth(manager)).expect(200);
    await http().get('/catalog').set(auth(manager)).expect(200);
    await http().get('/restaurant/subscription').set(auth(manager)).expect(403);
    await http().patch('/restaurant/settings').set(auth(manager)).send({ name: 'X' }).expect(403);

    const helper = (await http().post('/staff').set(auth(manager)).send({ username: `gh${suf}`, password: 'senha12345', name: 'Hugo Ajudante', roles: ['waiter'] }).expect(201)).body;
    await http().patch(`/staff/${helper.id}`).set(auth(manager)).send({ roles: ['waiter', 'cashier'] }).expect(200);
    expect((await http().patch(`/staff/${helper.id}`).set(auth(manager)).send({ roles: ['manager'] }).expect(403)).body.message).toBe('not_above');
    expect((await http().post('/staff').set(auth(manager)).send({ username: `gx${suf}`, password: 'senha12345', name: 'Xavier Novo', roles: ['manager'] }).expect(403)).body.message).toBe('not_above');
    expect((await http().post('/staff').set(auth(manager)).send({ username: `gx${suf}`, password: 'senha12345', name: 'Xavier Novo', roles: ['restaurant_admin'] }).expect(403)).body.message).toBe('owner');
    const team = (await http().get('/staff').set(auth(manager)).expect(200)).body as { id: string; username: string }[];
    const owner = team.find((m) => m.username === `adm${suf}`)!;
    await http().patch(`/staff/${owner.id}/password`).set(auth(manager)).send({ password: 'trocada12345' }).expect(403);
  });

  it('titular: transfere com a senha, o suporte troca com motivo e o banco aceita um só', async () => {
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY })).body.accessToken as string;
    const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const r = (await http().post('/admin/restaurants').set(auth(sa)).send({ name: `Titular ${suf}`, managerName: 'Rita', managerContact: '11977777777', planId, initialDueDate: due, adminUsername: `ti${suf}`, adminPassword: 'senha12345' }).expect(201)).body;
    const owner = await login(`ti${suf}`, r.slug);
    const settings = { name: 'Titular', managerName: 'Rita', managerContact: '11977777777', serviceFeeBps: 1000 };
    const gm = (await http().post('/staff').set(auth(owner)).send({ username: `tg${suf}`, password: 'senha12345', name: 'Gina Gerente', roles: ['manager', 'cashier'] }).expect(201)).body;
    const manager = await login(`tg${suf}`, r.slug);

    await http().post(`/staff/${gm.id}/transfer-ownership`).set(auth(manager)).send({ password: 'senha12345' }).expect(403);
    expect((await http().post(`/staff/${gm.id}/transfer-ownership`).set(auth(owner)).send({ password: 'errada123' }).expect(403)).body.message).toBe('wrong_password');
    await http().post(`/staff/${gm.id}/transfer-ownership`).set(auth(owner)).send({ password: 'senha12345' }).expect(204);

    // both tokens follow the new roles without signing in again
    await http().patch('/restaurant/settings').set(auth(owner)).send(settings).expect(403);
    await http().patch('/restaurant/settings').set(auth(manager)).send(settings).expect(200);
    const team = (await http().get('/staff').set(auth(manager)).expect(200)).body as { id: string; username: string; roles: string[] }[];
    expect(team.find((u) => u.id === gm.id)?.roles).toEqual(['restaurant_admin', 'cashier']);
    const former = team.find((u) => u.username === `ti${suf}`)!;
    expect(former.roles).toEqual(['manager']);

    // Elo support gives it back, with a reason and the dedicated permission
    await http().post('/admin/staff').set(auth(sa)).send({ username: `to${suf}`, name: 'Otto Suporte', password: 'senha12345', permissions: ['restaurants.view'] }).expect(201);
    const support = (await http().post('/auth/team/login').send({ username: `to${suf}`, password: 'senha12345' }).expect(201)).body.accessToken as string;
    expect((await http().get(`/admin/restaurants/${r.id}/staff`).set(auth(support)).expect(200)).body).toHaveLength(2);
    await http().post(`/admin/restaurants/${r.id}/owner`).set(auth(support)).send({ userId: former.id, reason: 'Pedido do dono' }).expect(403);
    await http().post(`/admin/restaurants/${r.id}/owner`).set(auth(sa)).send({ userId: former.id, reason: 'x' }).expect(400);
    await http().post(`/admin/restaurants/${r.id}/owner`).set(auth(sa)).send({ userId: former.id, reason: 'Pedido do dono' }).expect(204);
    await http().patch('/restaurant/settings').set(auth(owner)).send(settings).expect(200);
    const log = (await http().get(`/admin/restaurants/${r.id}/activity?category=team`).set(auth(sa)).expect(200)).body.items as { action: string; meta: { reason?: string } }[];
    expect(log.filter((a) => a.action === 'ownership_transferred')).toHaveLength(2);
    expect(log[0].meta.reason).toBe('Pedido do dono');

    const db = app.get(DataSource);
    await expect(db.query(`UPDATE staff_users SET roles = '{restaurant_admin}' WHERE id = $1`, [gm.id])).rejects.toThrow(/UQ_staff_restaurant_owner/);
  });

  it('funcionamento: fechado não abre mesa nova, mas as abertas terminam; paradas agendadas e encerradas', async () => {
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY })).body.accessToken as string;
    const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const r = (await http().post('/admin/restaurants').set(auth(sa)).send({ name: `Pausa ${suf}`, managerName: 'Rita', managerContact: '11977777777', planId, initialDueDate: due, adminUsername: `pa${suf}`, adminPassword: 'senha12345' }).expect(201)).body;
    const owner = await login(`pa${suf}`, r.slug);
    for (const [u, roles] of [['pg', ['manager']], ['pw', ['waiter']]] as const) {
      await http().post('/staff').set(auth(owner)).send({ username: u + suf, password: 'senha12345', name: `Pessoa ${u}`, roles }).expect(201);
    }
    const manager = await login(`pg${suf}`, r.slug);
    const waiterP = await login(`pw${suf}`, r.slug);
    const cat = (await http().post('/catalog/categories').set(auth(owner)).send({ name: 'Bebidas' }).expect(201)).body;
    const prod = (await http().post('/catalog/products').set(auth(owner)).send({ categoryId: cat.id, name: 'Suco', priceCents: 900 }).expect(201)).body;
    const [t1, t2] = [(await http().post('/tables').set(auth(owner)).send({ name: 'Mesa A' }).expect(201)).body, (await http().post('/tables').set(auth(owner)).send({ name: 'Mesa B' }).expect(201)).body];
    const seat = async (t: { token: string }) => cookieOf(await http().post(`/public/${r.slug}/${t.token}/session`).expect(201));

    // mesa A abre antes da parada
    const a = await seat(t1);
    await http().post('/public/session/open').set('Cookie', a).expect(201);
    await http().post(`/tables/${t1.id}/validate-open`).set(auth(waiterP)).expect(201);

    await http().post('/restaurant/pauses').set(auth(waiterP)).send({}).expect(403);
    const pause = (await http().post('/restaurant/pauses').set(auth(manager)).send({ reason: '  Falta de energia ' }).expect(201)).body;
    expect(pause).toMatchObject({ endsAt: null, reason: 'Falta de energia' });
    expect((await http().post('/restaurant/pauses').set(auth(owner)).send({}).expect(400)).body.problems).toEqual(['overlaps']);

    // nenhuma mesa nova abre; a que já estava aberta continua pedindo
    const b = await seat(t2);
    const closed = await http().post('/public/session/open').set('Cookie', b).expect(409);
    expect(closed.body).toMatchObject({ message: 'restaurant_closed', availability: { open: false, reason: 'pause', pauseReason: 'Falta de energia' } });
    await http().post('/public/session/orders').set('Cookie', a).send({ items: [{ productId: prod.id, quantity: 1 }] }).expect(201);
    const menu = (await http().get(`/public/${r.slug}/menu`).expect(200)).body;
    expect(menu.restaurant.availability).toMatchObject({ open: false, label: 'Fechado temporariamente' });
    const me = (await http().get('/restaurant/me').set(auth(waiterP)).expect(200)).body;
    expect(me.availability.reason).toBe('pause');

    // encerrada antes do fim: volta a abrir mesa
    await http().post(`/restaurant/pauses/${pause.id}/end`).set(auth(owner)).expect(204);
    await http().post(`/restaurant/pauses/${pause.id}/end`).set(auth(owner)).expect(404);
    await http().post('/public/session/open').set('Cookie', b).expect(201);

    // agendada: não fecha agora, aparece como próxima mudança e pode ser cancelada
    const later = new Date(Date.now() + 2 * 3_600_000).toISOString();
    const until = new Date(Date.now() + 5 * 3_600_000).toISOString();
    await http().post('/restaurant/pauses').set(auth(owner)).send({ startsAt: until, endsAt: later }).expect(400);
    const scheduled = (await http().post('/restaurant/pauses').set(auth(owner)).send({ startsAt: later, endsAt: until }).expect(201)).body;
    const list = (await http().get('/restaurant/pauses').set(auth(manager)).expect(200)).body;
    expect(list.availability).toMatchObject({ open: true, changesAt: later });
    expect(list.upcoming.map((p: { id: string }) => p.id)).toEqual([scheduled.id]);
    expect(list.past).toMatchObject({ total: 1, page: 1 });
    expect(list.past.items.map((p: { id: string }) => p.id)).toEqual([pause.id]);
    await http().post(`/restaurant/pauses/${scheduled.id}/end`).set(auth(manager)).expect(204);
    const after = (await http().get('/restaurant/pauses').set(auth(manager)).expect(200)).body;
    expect(after.upcoming).toEqual([]);
    // a closure cancelled before it started never happened: it is not listed with the past ones
    expect(after.past.items.map((p: { id: string }) => p.id)).toEqual([pause.id]);
    await http().get('/restaurant/pauses?page=0').set(auth(manager)).expect(400);

    // fora do horário: o garçom não valida a mesa pedida antes de fechar
    const settings = { name: `Pausa ${suf}`, managerName: 'Rita', managerContact: '11977777777', serviceFeeBps: 1000 };
    await http().patch('/restaurant/settings').set(auth(owner)).send({ ...settings, openingHours: [null, null, null, null, null, null, null] }).expect(200);
    const refused = await http().post(`/tables/${t2.id}/validate-open`).set(auth(waiterP)).expect(409);
    expect(refused.body.availability).toMatchObject({ reason: 'hours', label: 'Fechado' });
    await http().post(`/tables/${t2.id}/reject-open`).set(auth(waiterP)).expect(201);
    const log = (await http().get('/restaurant/activity?category=settings').set(auth(owner)).expect(200)).body.items as { action: string }[];
    expect(log.filter((l) => l.action === 'pause_created')).toHaveLength(2);
  });

  it('histórico de pedidos por perfil, foto de perfil e limpeza dos registros antigos', async () => {
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY })).body.accessToken as string;
    const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const r = (await http().post('/admin/restaurants').set(auth(sa)).send({ name: `Historico ${suf}`, managerName: 'Rita', managerContact: '11977777777', planId, initialDueDate: due, adminUsername: `hi${suf}`, adminPassword: 'senha12345' }).expect(201)).body;
    const owner = await login(`hi${suf}`, r.slug);
    const w = (await http().post('/staff').set(auth(owner)).send({ username: `hw${suf}`, password: 'senha12345', name: 'Helena Garcom', roles: ['waiter'] }).expect(201)).body;
    const waiterH = await login(`hw${suf}`, r.slug);
    const cat = (await http().post('/catalog/categories').set(auth(owner)).send({ name: 'Bebidas' }).expect(201)).body;
    const prod = (await http().post('/catalog/products').set(auth(owner)).send({ categoryId: cat.id, name: 'Suco', priceCents: 900 }).expect(201)).body;
    const t = (await http().post('/tables').set(auth(owner)).send({ name: 'Mesa H' }).expect(201)).body;
    const guest = cookieOf(await http().post(`/public/${r.slug}/${t.token}/session`).expect(201));
    await http().post('/public/session/open').set('Cookie', guest).expect(201);
    await http().post(`/tables/${t.id}/validate-open`).set(auth(waiterH)).expect(201);
    await http().post('/public/session/orders').set('Cookie', guest).send({ items: [{ productId: prod.id, quantity: 2 }] }).expect(201);

    // an old order: the waiter's window does not reach it, the owner's does
    const db = app.get(DataSource);
    const order = (await http().post('/public/session/orders').set('Cookie', guest).send({ items: [{ productId: prod.id, quantity: 1 }] }).expect(201)).body;
    await db.query(`UPDATE orders SET created_at = now() - interval '10 days' WHERE id = $1`, [order.id]);
    const full = (await http().get('/orders/history').set(auth(owner)).expect(200)).body;
    expect(full).toMatchObject({ total: 2, limitedFrom: null });
    expect(full.items[0]).toMatchObject({ tableName: 'Mesa H', totalCents: 1800, servedBy: 'Helena Garcom', closedAt: null });
    const recent = (await http().get('/orders/history').set(auth(waiterH)).expect(200)).body;
    expect(recent.total).toBe(1);
    expect(recent.limitedFrom).not.toBeNull();
    const old = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    expect((await http().get(`/orders/history?from=${old}&to=${old}`).set(auth(owner)).expect(200)).body.total).toBe(1);
    await http().get('/orders/history?from=ontem').set(auth(owner)).expect(400);

    // profile photo: own or set by a lead, never by a waiter for someone else; shown to the team only
    const png = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#2e7d32' } }).png().toBuffer();
    const mine = (await http().post('/me/avatar').set(auth(waiterH)).attach('file', png, 'eu.png').expect(201)).body;
    expect(mine.avatarUrl).toMatch(/^\/api\/media\/[0-9a-f-]{36}\.webp$/);
    expect((await http().get('/me').set(auth(waiterH)).expect(200)).body.avatarUrl).toBe(mine.avatarUrl);
    const ownerId = ((await http().get('/staff').set(auth(owner)).expect(200)).body as { id: string; username: string }[]).find((u) => u.username === `hi${suf}`)!.id;
    await http().post(`/staff/${ownerId}/avatar`).set(auth(waiterH)).attach('file', png, 'x.png').expect(403);
    await http().post(`/staff/${w.id}/avatar`).set(auth(owner)).attach('file', Buffer.from('nada'), 'x.png').expect(400);
    await http().delete(`/staff/${w.id}/avatar`).set(auth(owner)).expect(204);
    expect(((await http().get('/staff').set(auth(owner)).expect(200)).body as { id: string; avatarUrl: string | null }[]).find((u) => u.id === w.id)?.avatarUrl).toBeNull();
    await http().get(mine.avatarUrl).expect(404);

    // old activity entries are erased by the scheduled cleanup; recent ones stay
    const [{ id: oldLog }] = await db.query(`INSERT INTO audit_log (actor, actor_name, actor_kind, action, restaurant_id, created_at) VALUES ('system', 'Sistema', 'system', 'settings_updated', $1, now() - interval '400 days') RETURNING id`, [r.id]);
    expect(await app.get(ActivityCleanupService).run()).toBeGreaterThanOrEqual(1);
    expect(await db.query(`SELECT 1 FROM audit_log WHERE id = $1`, [oldLog])).toHaveLength(0);
    expect((await http().get('/restaurant/activity').set(auth(owner)).expect(200)).body.total).toBeGreaterThan(0);
  });

  it('validação: um código por campo, texto em branco recusado, tetos e login sem revelar regras', async () => {
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const bad = (await http().post('/tables').set(auth(admin)).send({ name: '    ' }).expect(400)).body;
    expect(bad).toEqual({ statusCode: 400, message: 'validation_failed', fields: { name: { code: 'required' } } });
    const many = (await http().post('/staff').set(auth(admin)).send({ username: 'Ana Lima', password: 'curta', name: 'Ana 123', roles: ['waiter'], extra: 1 }).expect(400)).body.fields;
    expect(many).toEqual({
      username: { code: 'invalid_username' },
      password: { code: 'too_short', params: { min: 8 } },
      name: { code: 'invalid_name' },
      extra: { code: 'unknown_field' },
    });
    const cat = (await http().post('/catalog/categories').set(auth(admin)).send({ name: '  Sobremesas   da casa ' }).expect(201)).body;
    expect(cat.name).toBe('Sobremesas da casa');
    const tooExpensive = (await http().post('/catalog/products').set(auth(admin)).send({ categoryId: cat.id, name: 'Caro', priceCents: 1_000_001 }).expect(400)).body.fields;
    expect(tooExpensive.priceCents).toEqual({ code: 'too_large', params: { max: 1_000_000, money: true } });
    const empty = (await http().post('/catalog/products').set(auth(admin)).send({ categoryId: cat.id, name: 'Sem escolha', priceCents: 100, options: [{ name: 'Tamanho', required: true, multiple: false, choices: [] }] }).expect(400)).body.fields;
    expect(empty['options.0.choices']).toEqual({ code: 'too_few' });
    const notes = (await http().post('/catalog/products').set(auth(admin)).send({ categoryId: cat.id, name: 'Foto', priceCents: 100, imageUrl: 'http://exemplo.com/a.png' }).expect(400)).body.fields;
    expect(notes.imageUrl).toEqual({ code: 'invalid_url' });

    // sign-in never tells the rules: a short password is just wrong
    await http().post(`/auth/restaurants/${slug}/login`).send({ username: 'ab', password: '123' }).expect(401);
    await http().post('/auth/restaurants/NAO VALE/login').send({ username: 'ana', password: 'senha12345' }).expect(400);

    // a very long name still gives a slug that fits every route
    const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY })).body.accessToken as string;
    const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const long = `${suf} Restaurante ${'muito '.repeat(15)}comprido`.slice(0, 118);
    const created = (await http().post('/admin/restaurants').set(auth(sa)).send({ name: long, managerName: 'Rita', managerContact: '11977777777', planId, initialDueDate: due, adminUsername: `lg${suf}`, adminPassword: 'senha12345' }).expect(201)).body;
    expect(created.slug.length).toBeLessThanOrEqual(60);
    await http().get(`/public/${created.slug}/menu`).expect(200);
    // impossible days and explicit nulls in required settings are refused, not turned into 500s
    expect((await http().get('/reports?from=2024-13-45&to=2024-13-46').set(auth(admin)).expect(400)).body.fields.from).toEqual({ code: 'invalid_date' });
    const me = (await http().get('/restaurant/me').set(auth(admin)).expect(200)).body;
    const base = { name: me.name, managerName: me.managerName, managerContact: me.managerContact, serviceFeeBps: me.serviceFeeBps };
    await http().patch('/restaurant/settings').set(auth(admin)).send({ ...base, guestFeeRefusal: null }).expect(400);
    await http().patch('/restaurant/settings').set(auth(admin)).send({ ...base, openingHours: [{ open: '10:00', close: '22:00', extra: 'x'.repeat(50) }, null, null, null, null, null, null] }).expect(200);
    expect(JSON.stringify((await http().get('/restaurant/me').set(auth(admin)).expect(200)).body.openingHours)).not.toContain('extra');
    await http().patch('/restaurant/settings').set(auth(admin)).send({ ...base, openingHours: null }).expect(200);
    const taken = (await http().post('/staff').set(auth(admin)).send({ username: `wai${suf}`, password: 'senha12345', name: 'Outra Pessoa', roles: ['waiter'] }).expect(409)).body;
    expect(taken).toMatchObject({ message: 'username_taken', field: 'username' });
  });
});
