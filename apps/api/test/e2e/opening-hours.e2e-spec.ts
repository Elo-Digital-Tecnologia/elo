import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { beforeAll, describe, expect, it } from 'vitest';
import { SUPERADMIN_KEY, codeOf, useFlow } from '../support/flow.js';

describe('opening hours (e2e)', () => {
    const flow = useFlow();
    const { suf, http, login, restaurant, cookieOf } = flow;
    let planId: string;
    beforeAll(() => ({ planId } = flow.fixture()));

    it('opening hours: closed means no new tables, but open ones finish; scheduled and ended closures', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY }))
            .body.accessToken as string;
        const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
        const r = (
            await restaurant(
                sa,
                {
                    name: `Pausa ${suf}`,
                    managerName: 'Rita',
                    managerContact: '11977777777',
                    planId,
                    initialDueDate: due,
                    adminUsername: `pa${suf}`,
                    adminPassword: 'senha12345'
                },
                201
            )
        ).body;
        const owner = await login(`pa${suf}`, r.slug);
        for (const [u, roles] of [
            ['pg', ['manager']],
            ['pw', ['waiter']]
        ] as const) {
            await http()
                .post('/staff')
                .set(auth(owner))
                .send({
                    username: u + suf,
                    password: 'senha12345',
                    name: `Pessoa ${u}`,
                    roles
                })
                .expect(201);
        }
        const manager = await login(`pg${suf}`, r.slug);
        const waiterP = await login(`pw${suf}`, r.slug);
        const cat = (
            await http()
                .post('/catalog/categories')
                .set(auth(owner))
                .send({ name: 'Bebidas' })
                .expect(201)
        ).body;
        const prod = (
            await http()
                .post('/catalog/products')
                .set(auth(owner))
                .send({ categoryId: cat.id, name: 'Suco', priceCents: 900 })
                .expect(201)
        ).body;
        const [t1, t2] = [
            (
                await http()
                    .post('/tables')
                    .set(auth(owner))
                    .send({ name: 'Mesa A' })
                    .expect(201)
            ).body,
            (
                await http()
                    .post('/tables')
                    .set(auth(owner))
                    .send({ name: 'Mesa B' })
                    .expect(201)
            ).body
        ];
        const seat = async (t: { token: string }) =>
            cookieOf(
                await http().post(`/public/${r.slug}/${t.token}/session`).expect(201)
            );

        // table A opens before the closure
        const a = await seat(t1);
        await http().post('/public/session/open').set('Cookie', a).expect(201);
        await http()
            .post(`/tables/${t1.id}/validate-open`)
            .set(auth(waiterP))
            .expect(201);

        await http().post('/restaurant/pauses').set(auth(waiterP)).send({}).expect(403);
        const pause = (
            await http()
                .post('/restaurant/pauses')
                .set(auth(manager))
                .send({ reason: '  Falta de energia ' })
                .expect(201)
        ).body;
        expect(pause).toMatchObject({ endsAt: null, reason: 'Falta de energia' });
        expect(
            (
                await http()
                    .post('/restaurant/pauses')
                    .set(auth(owner))
                    .send({})
                    .expect(400)
            ).body.details.map(codeOf)
        ).toEqual(['overlaps']);

        // no new table opens; the one already open keeps ordering
        const b = await seat(t2);
        const closed = await http()
            .post('/public/session/open')
            .set('Cookie', b)
            .expect(409);
        expect(closed.body).toMatchObject({
            code: ApiErrorCode.RESTAURANT_CLOSED,
            details: [
                {
                    availability: {
                        open: false,
                        reason: 'pause',
                        pauseReason: 'Falta de energia'
                    }
                }
            ]
        });
        await http()
            .post('/public/session/orders')
            .set('Cookie', a)
            .send({ items: [{ productId: prod.id, quantity: 1 }] })
            .expect(201);
        const menu = (await http().get(`/public/${r.slug}/menu`).expect(200)).body;
        expect(menu.restaurant.availability).toMatchObject({
            open: false,
            reason: 'pause',
            until: null
        });
        const me = (await http().get('/restaurant/me').set(auth(waiterP)).expect(200))
            .body;
        expect(me.availability.reason).toBe('pause');

        // ended early: tables open again
        await http()
            .post(`/restaurant/pauses/${pause.id}/end`)
            .set(auth(owner))
            .expect(204);
        await http()
            .post(`/restaurant/pauses/${pause.id}/end`)
            .set(auth(owner))
            .expect(404);
        await http().post('/public/session/open').set('Cookie', b).expect(201);

        // scheduled: does not close now, shows as the next change and can be cancelled
        const later = new Date(Date.now() + 2 * 3_600_000).toISOString();
        const until = new Date(Date.now() + 5 * 3_600_000).toISOString();
        await http()
            .post('/restaurant/pauses')
            .set(auth(owner))
            .send({ startsAt: until, endsAt: later })
            .expect(400);
        const scheduled = (
            await http()
                .post('/restaurant/pauses')
                .set(auth(owner))
                .send({ startsAt: later, endsAt: until })
                .expect(201)
        ).body;
        const list = (
            await http().get('/restaurant/pauses').set(auth(manager)).expect(200)
        ).body;
        expect(list.availability).toMatchObject({ open: true, changesAt: later });
        expect(list.upcoming.map((p: { id: string }) => p.id)).toEqual([scheduled.id]);
        expect(list.past).toMatchObject({ total: 1, page: 1 });
        expect(list.past.items.map((p: { id: string }) => p.id)).toEqual([pause.id]);
        await http()
            .post(`/restaurant/pauses/${scheduled.id}/end`)
            .set(auth(manager))
            .expect(204);
        const after = (
            await http().get('/restaurant/pauses').set(auth(manager)).expect(200)
        ).body;
        expect(after.upcoming).toEqual([]);
        // a closure cancelled before it started never happened: it is not listed with the past ones
        expect(after.past.items.map((p: { id: string }) => p.id)).toEqual([pause.id]);
        await http().get('/restaurant/pauses?page=0').set(auth(manager)).expect(400);

        // outside opening hours: the waiter cannot validate a table requested before closing
        const settings = {
            name: `Pausa ${suf}`,
            managerName: 'Rita',
            managerContact: '11977777777',
            serviceFeeBps: 1000
        };
        await http()
            .patch('/restaurant/settings')
            .set(auth(owner))
            .send({ ...settings, openingHours: [[], [], [], [], [], [], []] })
            .expect(200);
        const refused = await http()
            .post(`/tables/${t2.id}/validate-open`)
            .set(auth(waiterP))
            .expect(409);
        expect(refused.body.details[0].availability).toMatchObject({
            reason: 'hours',
            hours: { open: false, change: null }
        });
        // an extra opening outside the hours lets the table open; it needs an end and ends early on request
        expect(
            (
                await http()
                    .post('/restaurant/pauses')
                    .set(auth(manager))
                    .send({ kind: 'opening' })
                    .expect(400)
            ).body.details.map(codeOf)
        ).toEqual(['opening_needs_end']);
        const extra = (
            await http()
                .post('/restaurant/pauses')
                .set(auth(manager))
                .send({
                    kind: 'opening',
                    endsAt: new Date(Date.now() + 2 * 3_600_000).toISOString(),
                    reason: 'Evento'
                })
                .expect(201)
        ).body;
        expect(extra).toMatchObject({ kind: 'opening' });
        expect(
            (await http().get('/restaurant/me').set(auth(owner)).expect(200)).body
                .availability
        ).toMatchObject({ open: true, extra: true });
        // the request that was waiting can now be accepted
        await http()
            .post(`/tables/${t2.id}/validate-open`)
            .set(auth(waiterP))
            .expect(201);
        await http()
            .post(`/restaurant/pauses/${extra.id}/end`)
            .set(auth(owner))
            .expect(204);
        expect(
            (await http().get('/restaurant/me').set(auth(owner)).expect(200)).body
                .availability
        ).toMatchObject({ open: false, reason: 'hours' });
        // closed again: a new request is refused
        const t3 = (
            await http()
                .post('/tables')
                .set(auth(owner))
                .send({ name: 'Mesa C' })
                .expect(201)
        ).body;
        const c = await seat(t3);
        expect(
            (await http().post('/public/session/open').set('Cookie', c).expect(409)).body
                .code
        ).toBe(ApiErrorCode.RESTAURANT_CLOSED);
        const log = (
            await http()
                .get('/restaurant/activity?category=settings')
                .set(auth(owner))
                .expect(200)
        ).body.items as { action: string }[];
        expect(log.filter((l) => l.action === 'pause_created')).toHaveLength(2);
        expect(
            log.filter(
                (l) => l.action === 'opening_created' || l.action === 'opening_ended'
            )
        ).toHaveLength(2);
    });
});
