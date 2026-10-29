import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import sharp from 'sharp';
import { AppModule } from '../src/app.module';

/**
 * Fluxos críticos contra Postgres real (migrations aplicadas).
 * Ignorado quando DATABASE_URL não está definido.
 */
const suite = process.env.DATABASE_URL ? describe : describe.skip;
const SUPERADMIN_KEY = process.env.SUPERADMIN_KEY ?? '';

suite('fluxo da mesa (e2e)', () => {
  let app: INestApplication;
  let url: string;
  const suf = Date.now().toString(36);
  const http = () => request(app.getHttpServer());

  const login = async (username: string, inSlug = slug, password = 'senha12345') =>
    (await http().post(`/auth/restaurants/${inSlug}/login`).send({ username, password })).body.accessToken as string;

  let admin: string, waiter: string, kitchen: string;
  let slug: string, tableId: string, tableToken: string, productId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication<NestExpressApplication>();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0);
    url = await app.getUrl();

    const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY })).body.accessToken;
    const due = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const r = await http()
      .post('/admin/restaurants')
      .set('Authorization', `Bearer ${sa}`)
      .send({ name: `E2E ${suf}`, managerName: 'Maria', managerContact: '11999999999', dueDate: due, adminUsername: `adm${suf}`, adminPassword: 'senha12345' })
      .expect((res) => {
        if (res.status !== 201) throw new Error(JSON.stringify(res.body));
      });
    slug = r.body.slug;
    admin = await login(`adm${suf}`);
    for (const [u, role] of [['wai', 'waiter'], ['kit', 'kitchen']]) {
      await http().post('/staff').set('Authorization', `Bearer ${admin}`).send({ username: u + suf, password: 'senha12345', role }).expect(201);
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
    await http().post('/staff').set(auth(admin)).send({ username: 'cax' + suf, password: 'senha12345', role: 'cashier' }).expect(201);
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
    expect(bill.feeWaivedBy).toBeNull();
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
    const due = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const outro = await http().post('/admin/restaurants').set(auth(sa)).send({ name: `Outro ${suf}`, managerName: 'Joao', managerContact: '11988888888', dueDate: due, adminUsername: `out${suf}`, adminPassword: 'senha12345' }).expect(201);
    const other = await login(`out${suf}`, outro.body.slug);

    // login é por restaurante: usuário de um não entra no outro, e o mesmo nome pode existir nos dois
    await http().post(`/auth/restaurants/${slug}/login`).send({ username: `out${suf}`, password: 'senha12345' }).expect(401);
    await http().post(`/auth/restaurants/${outro.body.slug}/login`).send({ username: `adm${suf}`, password: 'senha12345' }).expect(401);
    await http().post('/auth/restaurants/nao-existe/login').send({ username: `adm${suf}`, password: 'senha12345' }).expect(401);
    await http().post('/auth/team/login').send({ username: `adm${suf}`, password: 'senha12345' }).expect(401);
    await http().post('/staff').set(auth(other)).send({ username: `adm${suf}`, password: 'senha12345', role: 'waiter' }).expect(201);
    await http().post('/staff').set(auth(other)).send({ username: `adm${suf}`, password: 'senha12345', role: 'waiter' }).expect(409);
    expect(await login(`adm${suf}`, outro.body.slug)).toBeTruthy();
    // acesso da equipe Elo ao restaurante: exige permissão, vale como admin, não mexe em senhas e é auditado
    const eloUser = `elo${suf}`;
    await http().post('/admin/staff').set(auth(sa)).send({ username: eloUser, password: 'senha12345', permissions: ['restaurants'] }).expect(201);
    const eloToken = (await http().post('/auth/team/login').send({ username: eloUser, password: 'senha12345' }).expect(201)).body.accessToken;
    const rid = (await http().get('/restaurant/me').set(auth(admin)).expect(200)).body.id;
    await http().post(`/admin/restaurants/${rid}/access`).set(auth(eloToken)).expect(403);
    const access = await http().post(`/admin/restaurants/${rid}/access`).set(auth(sa)).expect(201);
    expect(access.body.slug).toBe(slug);
    await http().get('/restaurant/me').set(auth(access.body.accessToken)).expect(200);
    await http().get('/tables').set(auth(access.body.accessToken)).expect(200);
    await http().patch('/me/password').set(auth(access.body.accessToken)).send({ current: 'senha12345', next: 'outrasenha123' }).expect(403);
    // the superadmin has no user row and can still record a payment
    const nextDue = new Date(Date.now() + 40 * 86_400_000).toISOString();
    await http().post(`/admin/restaurants/${rid}/payments`).set(auth(sa)).send({ amountCents: 9900, paidAt: new Date().toISOString(), newDueDate: nextDue }).expect(201);
    const paid = (await http().get(`/admin/restaurants/${rid}/payments`).set(auth(sa)).expect(200)).body;
    expect(paid[0]).toMatchObject({ amountCents: 9900, recordedBy: 'superadmin', recordedByName: 'Superadmin' });
    // slug reservado não vira restaurante
    await http().post('/admin/restaurants').set(auth(sa)).send({ name: 'Admin', managerName: 'Joao', managerContact: '11988888888', dueDate: due, adminUsername: `res${suf}`, adminPassword: 'senha12345' }).expect(409);
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
    const day = { open: '00:00', close: '23:59' };
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
    expect(saved.body).toMatchObject({ description: 'Pizzas no forno a lenha.', wifiName: 'Casa Verde', openStatus: { open: true } });

    // consulta pública mostra o perfil, mas nunca o Wi-Fi
    const pub = await http().get(`/public/${slug}/menu`).expect(200);
    expect(pub.body.restaurant).toMatchObject({ description: 'Pizzas no forno a lenha.', phone: '(11) 4000-1234', openStatus: { open: true } });
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
});
