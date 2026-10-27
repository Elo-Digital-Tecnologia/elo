import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
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

  const login = async (username: string) =>
    (await http().post('/auth/login').send({ username, password: 'senha12345' })).body.accessToken as string;

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
    await http().get('/public/session').set('Cookie', cookieOf(a)).expect(401);
    await http().get('/public/session').set('Cookie', cookieOf(b)).expect(200);
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
});
