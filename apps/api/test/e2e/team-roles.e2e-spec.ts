import type { INestApplication } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { io } from 'socket.io-client';
import { DataSource } from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';
import { SUPERADMIN_KEY, useFlow } from '../support/flow.js';

describe('team and roles (e2e)', () => {
    const flow = useFlow();
    const { suf, http, login, restaurant, cookieOf, waitFor } = flow;
    let app: INestApplication,
        url: string,
        slug: string,
        admin: string,
        waiter: string,
        kitchen: string,
        tableId: string,
        tableToken: string,
        productId: string,
        planId: string;
    beforeAll(
        () =>
            ({
                app,
                url,
                slug,
                admin,
                waiter,
                kitchen,
                tableId,
                tableToken,
                productId,
                planId
            } = flow.fixture())
    );

    it('team: several roles, a single owner, waiters racing, archiving and performance', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const create = (body: Record<string, unknown>) =>
            http()
                .post('/staff')
                .set(auth(admin))
                .send({ password: 'senha12345', ...body });

        // several roles for one person; the name is required
        await create({ username: `sem${suf}`, roles: ['waiter'] }).expect(400);
        await create({ username: `vaz${suf}`, name: 'Sem Perfil', roles: [] }).expect(
            400
        );
        await create({
            username: `kc${suf}`,
            name: 'Kátia Cozinha',
            roles: ['kitchen', 'cashier']
        }).expect(201);
        const kc = await login(`kc${suf}`);
        await http().get('/bills').set(auth(kc)).expect(200);
        await http().get('/orders').set(auth(kc)).expect(200);
        await http().get('/staff').set(auth(kc)).expect(403);

        // one owner per restaurant: nobody creates or promotes another administrator, and the owner does not archive themselves
        expect(
            (
                await create({
                    username: `ad2${suf}`,
                    name: 'Bruna Gerente',
                    roles: ['restaurant_admin', 'waiter']
                }).expect(403)
            ).body.code
        ).toBe(ApiErrorCode.TARGET_IS_OWNER);
        const team = (await http().get('/staff').set(auth(admin)).expect(200)).body as {
            id: string;
            username: string;
            name: string;
            roles: string[];
        }[];
        const me = team.find((u) => u.username === `adm${suf}`)!;
        const kcId = team.find((u) => u.username === `kc${suf}`)!.id;
        expect(
            (
                await http()
                    .patch(`/staff/${kcId}`)
                    .set(auth(admin))
                    .send({ roles: ['restaurant_admin'] })
                    .expect(403)
            ).body.code
        ).toBe(ApiErrorCode.TARGET_IS_OWNER);
        await http().delete(`/staff/${me.id}`).set(auth(admin)).expect(403);
        expect(team.find((u) => u.username === `kc${suf}`)).toMatchObject({
            name: 'Kátia Cozinha',
            roles: ['kitchen', 'cashier']
        });

        // two waiters validate the same table at once: only one wins, the other learns who did
        const w2 = (
            await create({
                username: `wb${suf}`,
                name: 'Ana Lima',
                displayName: 'Ana',
                roles: ['waiter']
            }).expect(201)
        ).body;
        const waiter2 = await login(`wb${suf}`);
        const sess = await http()
            .post(`/public/${slug}/${tableToken}/session`)
            .expect(201);
        const cookie = cookieOf(sess);
        await http().post('/public/session/open').set('Cookie', cookie).expect(201);
        const [r1, r2] = await Promise.all([
            http().post(`/tables/${tableId}/validate-open`).set(auth(waiter2)),
            http().post(`/tables/${tableId}/validate-open`).set(auth(waiter))
        ]);
        expect([r1.status, r2.status].sort()).toEqual([201, 409]);
        const loser = r1.status === 409 ? r1 : r2;
        expect(loser.body).toMatchObject({
            code: ApiErrorCode.ALREADY_HANDLED,
            details: [{ state: 'open' }]
        });
        const winnerIsAna = r1.status === 201;
        expect(loser.body.details[0].by).toBe(winnerIsAna ? 'Ana Lima' : 'Pessoa wai');
        const state = (
            await http().get('/public/session').set('Cookie', cookie).expect(200)
        ).body;
        expect(state.table.waiterName).toBe(winnerIsAna ? 'Ana' : 'Pessoa');

        // call: the first to answer takes it; the guest learns who is coming
        const call = (
            await http().post('/public/session/call').set('Cookie', cookie).expect(201)
        ).body;
        const guest = io(url, { extraHeaders: { cookie }, transports: ['websocket'] });
        await waitFor(guest, 'connect');
        await new Promise((r) => setTimeout(r, 200));
        const resolved = waitFor(guest, 'call.resolved');
        const [c1, c2] = await Promise.all([
            http().post(`/calls/${call.id}/resolve`).set(auth(waiter2)),
            http().post(`/calls/${call.id}/resolve`).set(auth(waiter))
        ]);
        expect([c1.status, c2.status].sort()).toEqual([201, 409]);
        const callWinner =
            c1.status === 201
                ? { name: 'Ana Lima', guest: 'Ana' }
                : { name: 'Pessoa wai', guest: 'Pessoa' };
        expect((c1.status === 409 ? c1 : c2).body).toMatchObject({
            code: ApiErrorCode.ALREADY_HANDLED,
            details: [{ by: callWinner.name }]
        });
        expect(((await resolved) as { handledBy: { name: string } }).handledBy.name).toBe(
            callWinner.guest
        );
        guest.close();

        // the kitchen reverts a step marked by mistake
        const order = (
            await http()
                .post('/public/session/orders')
                .set('Cookie', cookie)
                .send({ items: [{ productId, quantity: 1 }] })
                .expect(201)
        ).body;
        await http().patch(`/orders/${order.id}/revert`).set(auth(kitchen)).expect(409);
        // the kitchen identifies each order by table, in the list and in every response
        const listed = (await http().get('/orders').set(auth(kitchen)).expect(200))
            .body as { id: string; tableName: string }[];
        expect(listed.find((o) => o.id === order.id)?.tableName).toBe('Mesa 01');
        await http()
            .patch(`/orders/${order.id}/status`)
            .set(auth(kitchen))
            .send({ status: 'received' })
            .expect(200);
        expect(
            (
                await http()
                    .patch(`/orders/${order.id}/status`)
                    .set(auth(kitchen))
                    .send({ status: 'preparing' })
                    .expect(200)
            ).body.tableName
        ).toBe('Mesa 01');
        await http().patch(`/orders/${order.id}/revert`).set(auth(waiter)).expect(403);
        expect(
            (
                await http()
                    .patch(`/orders/${order.id}/revert`)
                    .set(auth(kitchen))
                    .expect(200)
            ).body.status
        ).toBe('received');
        await http()
            .post(`/public/session/orders/${order.id}/cancel`)
            .set('Cookie', cookie)
            .send({})
            .expect(201);

        // whoever serves an open table cannot be archived; once another waiter takes over, they can
        const servingId = winnerIsAna
            ? w2.id
            : team.find((u) => u.username === `wai${suf}`)!.id;
        const other = winnerIsAna ? waiter : waiter2;
        const busy = await http()
            .delete(`/staff/${servingId}`)
            .set(auth(admin))
            .expect(409);
        expect(busy.body).toMatchObject({
            code: ApiErrorCode.STAFF_BUSY,
            details: [{ tables: ['Mesa 01'] }]
        });
        await http().post(`/tables/${tableId}/take`).set(auth(other)).expect(201);
        await http().post(`/tables/${tableId}/close`).set(auth(other)).expect(201);

        const rep = (await http().get('/reports/staff').set(auth(admin)).expect(200))
            .body as {
            rows: {
                id: string;
                tablesOpened: number;
                tablesClosed: number;
                callsAnswered: number;
                avgOpenSeconds: number | null;
            }[];
        };
        const servingRow = rep.rows.find((r) => r.id === servingId)!;
        expect(servingRow.tablesOpened).toBeGreaterThanOrEqual(1);
        expect(servingRow.avgOpenSeconds).not.toBeNull();
        expect(rep.rows.reduce((n, r) => n + r.callsAnswered, 0)).toBeGreaterThanOrEqual(
            1
        );
        await http().get('/reports/staff').set(auth(waiter)).expect(403);

        // archived: leaves the team, cannot sign in, the username is freed and the history stays
        await http().delete(`/staff/${w2.id}`).set(auth(admin)).expect(204);
        await http()
            .post(`/auth/restaurants/${slug}/login`)
            .send({ username: `wb${suf}`, password: 'senha12345' })
            .expect(401);
        await http().get('/tables').set(auth(waiter2)).expect(401);
        expect(
            (
                (await http().get('/staff').set(auth(admin)).expect(200)).body as {
                    id: string;
                }[]
            ).some((u) => u.id === w2.id)
        ).toBe(false);
        await create({
            username: `wb${suf}`,
            name: 'Ana Nova',
            roles: ['waiter']
        }).expect(201);
        if (winnerIsAna) {
            const again = (
                await http().get('/reports/staff').set(auth(admin)).expect(200)
            ).body as { rows: { id: string; archived: boolean }[] };
            expect(again.rows.find((r) => r.id === w2.id)).toMatchObject({
                archived: true
            });
        }
    }, 30_000);

    it('changed roles apply at once and the panel gets a new token without signing in again', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const member = (
            await http()
                .post('/staff')
                .set(auth(admin))
                .send({
                    username: `pf${suf}`,
                    password: 'senha12345',
                    name: 'Paula Fernandes',
                    roles: ['waiter']
                })
                .expect(201)
        ).body;
        const before = await login(`pf${suf}`);
        await http().get('/calls').set(auth(before)).expect(200);
        await http()
            .patch(`/staff/${member.id}`)
            .set(auth(admin))
            .send({ roles: ['kitchen'] })
            .expect(200);
        // the old token already carries the new roles on the server
        await http().get('/calls').set(auth(before)).expect(403);
        await http().get('/orders').set(auth(before)).expect(200);
        const signIn = await http()
            .post(`/auth/restaurants/${slug}/login`)
            .send({ username: `pf${suf}`, password: 'senha12345' })
            .expect(201);
        const fresh = (
            await http()
                .post('/auth/session')
                .set('Cookie', cookieOf(signIn))
                .send({ scope: `r:${slug}` })
                .expect(201)
        ).body.accessToken as string;
        const claims = JSON.parse(
            Buffer.from(fresh.split('.')[1], 'base64url').toString()
        );
        expect(claims).toMatchObject({ sub: member.id, roles: ['kitchen'] });
        // answering calls is the waiters' job, and the floor only lists orders of tables still in use
        await http()
            .post(`/calls/00000000-0000-4000-8000-000000000000/resolve`)
            .set(auth(admin))
            .expect(403);
        await http().get('/orders?open=true&status=ready').set(auth(admin)).expect(200);
    });

    it('manager: runs the day and the operational team, without settings or admins', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        await http()
            .post('/staff')
            .set(auth(admin))
            .send({
                username: `gr${suf}`,
                password: 'senha12345',
                name: 'Gerson Ramos',
                roles: ['manager']
            })
            .expect(201);
        const manager = await login(`gr${suf}`);
        await http().get('/reports').set(auth(manager)).expect(200);
        await http().get('/restaurant/activity').set(auth(manager)).expect(200);
        await http().get('/catalog').set(auth(manager)).expect(200);
        await http().get('/restaurant/subscription').set(auth(manager)).expect(403);
        await http()
            .patch('/restaurant/settings')
            .set(auth(manager))
            .send({ name: 'X' })
            .expect(403);

        const helper = (
            await http()
                .post('/staff')
                .set(auth(manager))
                .send({
                    username: `gh${suf}`,
                    password: 'senha12345',
                    name: 'Hugo Ajudante',
                    roles: ['waiter']
                })
                .expect(201)
        ).body;
        await http()
            .patch(`/staff/${helper.id}`)
            .set(auth(manager))
            .send({ roles: ['waiter', 'cashier'] })
            .expect(200);
        expect(
            (
                await http()
                    .patch(`/staff/${helper.id}`)
                    .set(auth(manager))
                    .send({ roles: ['manager'] })
                    .expect(403)
            ).body.code
        ).toBe(ApiErrorCode.TARGET_NOT_BELOW);
        expect(
            (
                await http()
                    .post('/staff')
                    .set(auth(manager))
                    .send({
                        username: `gx${suf}`,
                        password: 'senha12345',
                        name: 'Xavier Novo',
                        roles: ['manager']
                    })
                    .expect(403)
            ).body.code
        ).toBe(ApiErrorCode.TARGET_NOT_BELOW);
        expect(
            (
                await http()
                    .post('/staff')
                    .set(auth(manager))
                    .send({
                        username: `gx${suf}`,
                        password: 'senha12345',
                        name: 'Xavier Novo',
                        roles: ['restaurant_admin']
                    })
                    .expect(403)
            ).body.code
        ).toBe(ApiErrorCode.TARGET_IS_OWNER);
        const team = (await http().get('/staff').set(auth(manager)).expect(200)).body as {
            id: string;
            username: string;
        }[];
        const owner = team.find((m) => m.username === `adm${suf}`)!;
        await http()
            .patch(`/staff/${owner.id}/password`)
            .set(auth(manager))
            .send({ password: 'trocada12345' })
            .expect(403);
    });

    it('owner: transfers with the password, support changes it with a reason and the database allows only one', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY }))
            .body.accessToken as string;
        const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
        const r = (
            await restaurant(
                sa,
                {
                    name: `Titular ${suf}`,
                    managerName: 'Rita',
                    managerContact: '11977777777',
                    planId,
                    initialDueDate: due,
                    adminUsername: `ti${suf}`,
                    adminPassword: 'senha12345'
                },
                201
            )
        ).body;
        const owner = await login(`ti${suf}`, r.slug);
        const settings = {
            name: 'Titular',
            managerName: 'Rita',
            managerContact: '11977777777',
            serviceFeeBps: 1000
        };
        const gm = (
            await http()
                .post('/staff')
                .set(auth(owner))
                .send({
                    username: `tg${suf}`,
                    password: 'senha12345',
                    name: 'Gina Gerente',
                    roles: ['manager', 'cashier']
                })
                .expect(201)
        ).body;
        const manager = await login(`tg${suf}`, r.slug);

        await http()
            .post(`/staff/${gm.id}/transfer-ownership`)
            .set(auth(manager))
            .send({ password: 'senha12345' })
            .expect(403);
        expect(
            (
                await http()
                    .post(`/staff/${gm.id}/transfer-ownership`)
                    .set(auth(owner))
                    .send({ password: 'errada123' })
                    .expect(403)
            ).body.code
        ).toBe(ApiErrorCode.WRONG_PASSWORD);
        await http()
            .post(`/staff/${gm.id}/transfer-ownership`)
            .set(auth(owner))
            .send({ password: 'senha12345' })
            .expect(204);

        // both tokens follow the new roles without signing in again
        await http()
            .patch('/restaurant/settings')
            .set(auth(owner))
            .send(settings)
            .expect(403);
        await http()
            .patch('/restaurant/settings')
            .set(auth(manager))
            .send(settings)
            .expect(200);
        const team = (await http().get('/staff').set(auth(manager)).expect(200)).body as {
            id: string;
            username: string;
            roles: string[];
        }[];
        expect(team.find((u) => u.id === gm.id)?.roles).toEqual([
            'restaurant_admin',
            'cashier'
        ]);
        const former = team.find((u) => u.username === `ti${suf}`)!;
        expect(former.roles).toEqual(['manager']);

        // Elo support gives it back, with a reason and the dedicated permission
        await http()
            .post('/admin/staff')
            .set(auth(sa))
            .send({
                username: `to${suf}`,
                name: 'Otto Suporte',
                password: 'senha12345',
                permissions: ['restaurants.view']
            })
            .expect(201);
        const support = (
            await http()
                .post('/auth/team/login')
                .send({ username: `to${suf}`, password: 'senha12345' })
                .expect(201)
        ).body.accessToken as string;
        expect(
            (
                await http()
                    .get(`/admin/restaurants/${r.id}/staff`)
                    .set(auth(support))
                    .expect(200)
            ).body
        ).toHaveLength(2);
        await http()
            .post(`/admin/restaurants/${r.id}/owner`)
            .set(auth(support))
            .send({ userId: former.id, reason: 'Pedido do dono' })
            .expect(403);
        await http()
            .post(`/admin/restaurants/${r.id}/owner`)
            .set(auth(sa))
            .send({ userId: former.id, reason: 'x' })
            .expect(400);
        await http()
            .post(`/admin/restaurants/${r.id}/owner`)
            .set(auth(sa))
            .send({ userId: former.id, reason: 'Pedido do dono' })
            .expect(204);
        await http()
            .patch('/restaurant/settings')
            .set(auth(owner))
            .send(settings)
            .expect(200);
        const log = (
            await http()
                .get(`/admin/restaurants/${r.id}/activity?category=team`)
                .set(auth(sa))
                .expect(200)
        ).body.items as { action: string; meta: { reason?: string } }[];
        expect(log.filter((a) => a.action === 'ownership_transferred')).toHaveLength(2);
        expect(log[0].meta.reason).toBe('Pedido do dono');

        const db = app.get(DataSource);
        await expect(
            db.query(
                `UPDATE staff_users SET roles = '{restaurant_admin}' WHERE id = $1`,
                [gm.id]
            )
        ).rejects.toThrow(/UQ_staff_restaurant_owner/);
    });
});
