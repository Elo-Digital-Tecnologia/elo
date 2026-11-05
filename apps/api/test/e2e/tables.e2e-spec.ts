import type { INestApplication } from '@nestjs/common';
import type request from 'supertest';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { io } from 'socket.io-client';
import { DataSource } from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';
import { TABLE_SESSION_START_LIMIT } from '#/modules/tables/table.constants.js';
import { useFlow } from '../support/flow.js';

describe('tables and guest sessions (e2e)', () => {
    const flow = useFlow();
    const { suf, http, cookieOf, waitFor } = flow;
    let app: INestApplication,
        url: string,
        slug: string,
        admin: string,
        waiter: string,
        kitchen: string,
        tableId: string,
        tableToken: string,
        productId: string;
    beforeAll(
        () =>
            ({ app, url, slug, admin, waiter, kitchen, tableId, tableToken, productId } =
                flow.fixture())
    );

    it('abandoned scan on a closed table does not lock it', async () => {
        const a = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
        const b = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
        // the device that lost the table gets the reason, not a generic "ended"
        const lost = await http()
            .get('/public/session')
            .set('Cookie', cookieOf(a))
            .expect(401);
        expect(lost.body.code).toBe(ApiErrorCode.SESSION_TAKEN_OVER);
        await http().post('/public/session/open').set('Cookie', cookieOf(a)).expect(401);
        await http().get('/public/session').set('Cookie', cookieOf(b)).expect(200);
        await http().get('/public/session').expect(401);
    });

    it('session ends with a specific reason: waiter rejects the opening, waiter closes the table', async () => {
        const auth = { Authorization: `Bearer ${waiter}` };
        const a = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
        await http().post('/public/session/open').set('Cookie', cookieOf(a)).expect(201);
        // once the opening is requested, another device gets a conflict without dropping the first one
        await http().post(`/public/${slug}/${tableToken}/session`).expect(409);
        await http().get('/public/session').set('Cookie', cookieOf(a)).expect(200);
        await http().post(`/tables/${tableId}/reject-open`).set(auth).expect(201);
        expect(
            (await http().get('/public/session').set('Cookie', cookieOf(a)).expect(401))
                .body.code
        ).toBe(ApiErrorCode.SESSION_REJECTED);

        const b = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
        await http().post('/public/session/open').set('Cookie', cookieOf(b)).expect(201);
        await http().post(`/tables/${tableId}/validate-open`).set(auth).expect(201);
        await http().post(`/tables/${tableId}/close`).set(auth).expect(201);
        expect(
            (await http().get('/public/session').set('Cookie', cookieOf(b)).expect(401))
                .body.code
        ).toBe(ApiErrorCode.SESSION_CLOSED);
    });

    it('one table per device in a restaurant: sent back to it once it moved past closed', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const newTable = async (token: string, inSlug: string, name: string) => {
            const t = await http()
                .post('/tables')
                .set(auth(token))
                .send({ name })
                .expect(201);
            return {
                id: t.body.id as string,
                start: (cookie?: string) => {
                    const req = http().post(`/public/${inSlug}/${t.body.token}/session`);
                    return cookie ? req.set('Cookie', cookie) : req;
                }
            };
        };
        const a = await newTable(admin, slug, 'Mesa A');
        const b = await newTable(admin, slug, 'Mesa B');

        // only scanned A: scanning B moves the device there and leaves A free
        const first = cookieOf(await a.start().expect(201));
        const moved = cookieOf(await b.start(first).expect(201));
        expect(
            (await http().get('/public/session').set('Cookie', first).expect(401)).body
                .code
        ).toBe(ApiErrorCode.SESSION_TAKEN_OVER);

        // asked to open B: scanning A is refused and the device keeps B
        await http().post('/public/session/open').set('Cookie', moved).expect(201);
        const refused = await a.start(moved).expect(409);
        expect(refused.body.code).toBe(ApiErrorCode.ACTIVE_TABLE_ELSEWHERE);
        expect(refused.body.details).toEqual([{ tableName: 'Mesa B' }]);
        const kept = await http().get('/public/session').set('Cookie', moved).expect(200);
        expect(kept.body.table.name).toBe('Mesa B');

        // another restaurant is not affected
        const { planId } = flow.fixture();
        const other = (
            await flow.restaurant(await flow.superadmin(), {
                name: `Outro ${suf}`,
                managerName: 'Rita',
                managerContact: '11977777777',
                planId,
                adminUsername: `ou${suf}`,
                adminPassword: 'senha12345'
            })
        ).body;
        const elsewhere = await newTable(
            await flow.login(`ou${suf}`, other.slug),
            other.slug,
            'Mesa X'
        );
        await elsewhere.start(moved).expect(201);

        // once the waiter closes B, A can be scanned again
        await http().post(`/tables/${b.id}/reject-open`).set(auth(waiter)).expect(201);
        await a.start(moved).expect(201);
    });

    it('a table accepts only a few new sessions per window, whatever the address', async () => {
        const t = await http()
            .post('/tables')
            .set('Authorization', `Bearer ${admin}`)
            .send({ name: 'Mesa limite' })
            .expect(201);
        const start = () => http().post(`/public/${slug}/${t.body.token}/session`);
        let last: request.Response | undefined;
        for (let i = 0; i < TABLE_SESSION_START_LIMIT.max; i++)
            last = await start().expect(201);
        expect((await start().expect(429)).body.code).toBe(
            ApiErrorCode.TOO_MANY_REQUESTS
        );
        // the device already in the table keeps its session
        await http()
            .post(`/public/${slug}/${t.body.token}/session`)
            .set('Cookie', cookieOf(last!))
            .expect(201);
    });

    it('rejects invalid token and unvalidated ordering', async () => {
        await http()
            .post(`/public/${slug}/${'a'.repeat(32)}/session`)
            .expect(404);
        const s = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
        await http()
            .post('/public/session/orders')
            .set('Cookie', cookieOf(s))
            .send({ items: [{ productId, quantity: 1 }] })
            .expect(400);
    });

    it('open → validate → order (realtime) → kitchen → close ends session', async () => {
        const s = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
        const cookie = cookieOf(s);
        await http().post('/public/session/open').set('Cookie', cookie).expect(201);
        await http().post(`/public/${slug}/${tableToken}/session`).expect(409);
        await http()
            .post('/public/session/orders')
            .set('Cookie', cookie)
            .send({ items: [{ productId, quantity: 1 }] })
            .expect(400);
        await http()
            .post(`/tables/${tableId}/validate-open`)
            .set('Authorization', `Bearer ${kitchen}`)
            .expect(403);
        await http()
            .post(`/tables/${tableId}/validate-open`)
            .set('Authorization', `Bearer ${waiter}`)
            .expect(201);

        const kitchenSocket = io(url, {
            auth: { token: kitchen },
            transports: ['websocket']
        });
        const customerSocket = io(url, {
            extraHeaders: { cookie },
            transports: ['websocket']
        });
        const anon = io(url, { transports: ['websocket'] });
        await Promise.all([
            waitFor(kitchenSocket, 'connect'),
            waitFor(customerSocket, 'connect'),
            waitFor(anon, 'disconnect')
        ]);
        await new Promise((r) => setTimeout(r, 200));

        const created = waitFor(kitchenSocket, 'order.created');
        const order = await http()
            .post('/public/session/orders')
            .set('Cookie', cookie)
            .send({ items: [{ productId, quantity: 2 }] })
            .expect(201);
        expect(((await created) as { tableName: string }).tableName).toBe('Mesa 01');

        await http()
            .patch(`/orders/${order.body.id}/status`)
            .set('Authorization', `Bearer ${kitchen}`)
            .send({ status: 'ready' })
            .expect(409);
        const updated = waitFor(customerSocket, 'order.updated');
        await http()
            .patch(`/orders/${order.body.id}/status`)
            .set('Authorization', `Bearer ${kitchen}`)
            .send({ status: 'received' })
            .expect(200);
        expect(((await updated) as { status: string }).status).toBe('received');

        // the bill waits for the kitchen: no asking for it while an order is still being made
        expect(
            (await http().post('/public/session/close').set('Cookie', cookie).expect(409))
                .body.code
        ).toBe(ApiErrorCode.ORDERS_IN_PROGRESS);
        for (const status of ['preparing', 'ready']) {
            await http()
                .patch(`/orders/${order.body.id}/status`)
                .set('Authorization', `Bearer ${kitchen}`)
                .send({ status })
                .expect(200);
        }
        await http().post('/public/session/close').set('Cookie', cookie).expect(201);
        await http()
            .post(`/tables/${tableId}/close`)
            .set('Authorization', `Bearer ${kitchen}`)
            .expect(403);
        await http()
            .post(`/tables/${tableId}/close`)
            .set('Authorization', `Bearer ${waiter}`)
            .expect(201);
        await http().get('/public/session').set('Cookie', cookie).expect(401);

        kitchenSocket.close();
        customerSocket.close();
        anon.close();
    });

    it('waiter cancel needs reason and own table; customer cannot cancel in preparation', async () => {
        const s = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
        const cookie = cookieOf(s);
        await http().post('/public/session/open').set('Cookie', cookie).expect(201);
        await http()
            .post(`/tables/${tableId}/validate-open`)
            .set('Authorization', `Bearer ${waiter}`)
            .expect(201);
        const order = await http()
            .post('/public/session/orders')
            .set('Cookie', cookie)
            .send({ items: [{ productId, quantity: 1 }] })
            .expect(201);
        for (const status of ['received', 'preparing']) {
            await http()
                .patch(`/orders/${order.body.id}/status`)
                .set('Authorization', `Bearer ${kitchen}`)
                .send({ status })
                .expect(200);
        }
        await http()
            .post(`/public/session/orders/${order.body.id}/cancel`)
            .set('Cookie', cookie)
            .send({})
            .expect(403);
        await http()
            .post(`/orders/${order.body.id}/cancel`)
            .set('Authorization', `Bearer ${waiter}`)
            .send({ reason: '' })
            .expect(400);
        await http()
            .post(`/orders/${order.body.id}/cancel`)
            .set('Authorization', `Bearer ${waiter}`)
            .send({ reason: 'cliente desistiu' })
            .expect(201);
        await http()
            .post(`/tables/${tableId}/close`)
            .set('Authorization', `Bearer ${waiter}`)
            .expect(201);
    });

    it('guest: news only while the table is open, and the device is forgotten when it closes', async () => {
        const auth = { Authorization: `Bearer ${waiter}` };
        const db = app.get(DataSource);
        const count = async () =>
            Number(
                (
                    await db.query(
                        `SELECT COUNT(*) AS n FROM guest_push_subscriptions WHERE table_id = $1`,
                        [tableId]
                    )
                )[0].n
            );
        const device = {
            endpoint: `https://fcm.googleapis.com/fcm/send/guest-${suf}`,
            keys: { p256dh: 'BOr6fJp5q0q3mWJZ2zKj8yG', auth: 'c2VjcmV0' }
        };

        await http().get('/public/push-key').expect(200);
        const g = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
        await http()
            .post('/public/session/push')
            .set('Cookie', cookieOf(g))
            .send(device)
            .expect(409);
        await http().post('/public/session/open').set('Cookie', cookieOf(g)).expect(201);
        await http().post(`/tables/${tableId}/validate-open`).set(auth).expect(201);
        await http()
            .post('/public/session/push')
            .set('Cookie', cookieOf(g))
            .send({ ...device, endpoint: 'http://insecure.example.com/x' })
            .expect(400);
        await http()
            .post('/public/session/push')
            .set('Cookie', cookieOf(g))
            .send(device)
            .expect(204);
        expect(await count()).toBe(1);

        await http().post(`/tables/${tableId}/close`).set(auth).expect(201);
        for (let i = 0; i < 20 && (await count()) > 0; i++)
            await new Promise((r) => setTimeout(r, 50));
        expect(await count()).toBe(0);
    });
});
