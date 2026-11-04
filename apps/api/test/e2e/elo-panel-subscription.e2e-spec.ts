import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeAll, describe, expect, it } from 'vitest';
import { RestaurantLifecycleService } from '#/modules/restaurants/restaurant-lifecycle.service.js';
import { SUPERADMIN_KEY, codeOf, useFlow } from '../support/flow.js';

describe('Elo panel and subscription (e2e)', () => {
    const flow = useFlow();
    const { suf, http, login, restaurant } = flow;
    let app: INestApplication, admin: string, planId: string;
    beforeAll(() => ({ app, admin, planId } = flow.fixture()));

    it('Elo panel: split permissions, filtered list and two-step deletion', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY }))
            .body.accessToken as string;
        const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
        const newRestaurant = (name: string, admin: string) =>
            restaurant(
                sa,
                {
                    name,
                    managerName: 'Rita',
                    managerContact: '11977777777',
                    planId,
                    initialDueDate: due,
                    adminUsername: admin,
                    adminPassword: 'senha12345'
                },
                201
            );
        const teamLogin = async (username: string) =>
            (
                await http()
                    .post('/auth/team/login')
                    .send({ username, password: 'senha12345' })
                    .expect(201)
            ).body.accessToken as string;

        // permissions: each depends on "view"; nobody grants what they lack; only the superadmin grants delete
        const viewer = (
            await http()
                .post('/admin/staff')
                .set(auth(sa))
                .send({
                    username: `vw${suf}`,
                    name: 'Vera Leitura',
                    password: 'senha12345',
                    permissions: ['payments.record']
                })
                .expect(201)
        ).body;
        expect(viewer.permissions).toEqual([
            'restaurants.view',
            'payments.view',
            'payments.record'
        ]);
        await http()
            .post('/admin/staff')
            .set(auth(sa))
            .send({
                username: `tm${suf}`,
                name: 'Tito Equipe',
                password: 'senha12345',
                permissions: ['team.manage', 'payments.view', 'restaurants.delete']
            })
            .expect(201);
        const manager = await teamLogin(`tm${suf}`);
        await http()
            .post('/admin/staff')
            .set(auth(manager))
            .send({
                username: `x1${suf}`,
                name: 'Xis Um',
                password: 'senha12345',
                permissions: ['payments.record']
            })
            .expect(403);
        await http()
            .post('/admin/staff')
            .set(auth(manager))
            .send({
                username: `x1${suf}`,
                name: 'Xis Um',
                password: 'senha12345',
                permissions: ['payments.view']
            })
            .expect(201);
        await http()
            .patch(`/admin/staff/${viewer.id}`)
            .set(auth(manager))
            .send({ permissions: ['restaurants.delete'] })
            .expect(403);
        const vw = await teamLogin(`vw${suf}`);
        await restaurant(vw, {}, 403);
        await http().get('/admin/restaurants?status=deleted').set(auth(vw)).expect(403);
        // tokens issued before the split keep working for what they covered
        const legacy = app.get(JwtService).sign({
            sub: viewer.id,
            role: 'elo_admin',
            restaurantId: null,
            permissions: ['subscriptions']
        });
        const any = (
            await http()
                .get('/admin/restaurants?pageSize=5')
                .set(auth(legacy))
                .expect(200)
        ).body.items[0].id;
        await http()
            .get(`/admin/restaurants/${any}/payments`)
            .set(auth(legacy))
            .expect(200);

        // list: search, status, page and counts
        const a = (await newRestaurant(`Busca ${suf} Alfa`, `ba${suf}`)).body;
        const b = (await newRestaurant(`Busca ${suf} Beta`, `bb${suf}`)).body;
        const found = (
            await http()
                .get(
                    `/admin/restaurants?q=${encodeURIComponent(`busca ${suf}`)}&pageSize=5`
                )
                .set(auth(vw))
                .expect(200)
        ).body;
        expect(found.items.map((r: { slug: string }) => r.slug)).toEqual([
            a.slug,
            b.slug
        ]);
        expect(found).toMatchObject({
            total: 2,
            page: 1,
            pageSize: 5,
            counts: { all: 2, active: 2, grace: 0, suspended: 0 }
        });
        expect(found.counts.deleted).toBeUndefined();
        const page2 = (
            await http()
                .get(
                    `/admin/restaurants?q=${encodeURIComponent(`busca ${suf}`)}&pageSize=5&page=2`
                )
                .set(auth(vw))
                .expect(200)
        ).body;
        expect(page2.items).toEqual([]);
        await http()
            .patch(`/admin/restaurants/${a.id}`)
            .set(auth(vw))
            .send({ name: 'Outro' })
            .expect(403);
        await http()
            .patch(`/admin/restaurants/${a.id}`)
            .set(auth(sa))
            .send({ name: `Busca ${suf} Alfa Novo` })
            .expect(200);

        // deletion: only when suspended, with the slug typed; hidden everywhere; can be restored; erased after the period
        await http()
            .delete(`/admin/restaurants/${b.id}`)
            .set(auth(sa))
            .send({ confirmSlug: b.slug })
            .expect(409);
        await http().post(`/admin/restaurants/${b.id}/suspend`).set(auth(sa)).expect(201);
        const suspendedList = (
            await http()
                .get(
                    `/admin/restaurants?q=${encodeURIComponent(`busca ${suf}`)}&status=suspended`
                )
                .set(auth(sa))
                .expect(200)
        ).body;
        expect(suspendedList.items.map((r: { id: string }) => r.id)).toEqual([b.id]);
        await http()
            .delete(`/admin/restaurants/${b.id}`)
            .set(auth(vw))
            .send({ confirmSlug: b.slug })
            .expect(403);
        await http()
            .delete(`/admin/restaurants/${b.id}`)
            .set(auth(sa))
            .send({ confirmSlug: 'errado' })
            .expect(400);
        await http()
            .delete(`/admin/restaurants/${b.id}`)
            .set(auth(manager))
            .send({ confirmSlug: b.slug })
            .expect(204);
        await http().get(`/public/${b.slug}/menu`).expect(404);
        await http()
            .post(`/auth/restaurants/${b.slug}/login`)
            .send({ username: `bb${suf}`, password: 'senha12345' })
            .expect(401);
        await restaurant(
            sa,
            {
                name: 'Xis',
                slug: b.slug,
                managerName: 'Rita',
                managerContact: '11977777777',
                planId,
                initialDueDate: due,
                adminUsername: `bz${suf}`,
                adminPassword: 'senha12345'
            },
            409
        );
        const afterDelete = (
            await http()
                .get(`/admin/restaurants?q=${encodeURIComponent(`busca ${suf}`)}`)
                .set(auth(sa))
                .expect(200)
        ).body;
        expect(afterDelete.items.map((r: { id: string }) => r.id)).toEqual([a.id]);
        expect(afterDelete.counts.deleted).toBe(1);
        const deleted = (
            await http()
                .get(
                    `/admin/restaurants?q=${encodeURIComponent(`busca ${suf}`)}&status=deleted`
                )
                .set(auth(sa))
                .expect(200)
        ).body;
        expect(deleted.items[0]).toMatchObject({ id: b.id });
        expect(
            Date.parse(deleted.items[0].purgeAt) - Date.parse(deleted.items[0].deletedAt)
        ).toBe(90 * 86_400_000);
        const exported = (
            await http()
                .get(`/admin/restaurants/${b.id}/export`)
                .set(auth(sa))
                .expect(200)
        ).body;
        expect(exported.restaurant.slug).toBe(b.slug);
        expect(exported.staff[0].username).toBe(`bb${suf}`);
        expect(exported.staff[0].passwordHash).toBeUndefined();

        const restored = (
            await http()
                .post(`/admin/restaurants/${b.id}/restore`)
                .set(auth(sa))
                .expect(201)
        ).body;
        expect(restored).toMatchObject({ id: b.id, suspended: true });
        await http().get(`/public/${b.slug}/menu`).expect(200);
        await http()
            .delete(`/admin/restaurants/${b.id}`)
            .set(auth(sa))
            .send({ confirmSlug: b.slug })
            .expect(204);

        const lifecycle = app.get(RestaurantLifecycleService);
        expect(await lifecycle.purgeExpired({ ids: [b.id] })).toEqual([]);
        expect(
            await lifecycle.purgeExpired({
                now: new Date(Date.now() + 91 * 86_400_000),
                ids: [b.id]
            })
        ).toEqual([b.id]);
        await http().get(`/admin/restaurants/${b.id}/export`).set(auth(sa)).expect(404);
        const slugFree = await restaurant(
            sa,
            {
                name: 'Volta',
                slug: b.slug,
                managerName: 'Rita',
                managerContact: '11977777777',
                planId,
                initialDueDate: due,
                adminUsername: `bb${suf}`,
                adminPassword: 'senha12345'
            },
            201
        );
        expect(slugFree.body.slug).toBe(b.slug);
    }, 30_000);

    it('subscription: plans, calculated payment, void, due date adjustment and support mode', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY }))
            .body.accessToken as string;
        const dayFrom = (days: number) =>
            new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
        const addMonth = (d: string) => {
            const [y, m, dd] = d.split('-').map(Number);
            const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
            return new Date(Date.UTC(y, m, Math.min(dd, last)))
                .toISOString()
                .slice(0, 10);
        };

        // trial ended a month ago: suspended for being overdue, and "reactivate" alone does not fix it
        const r = (
            await restaurant(
                sa,
                {
                    name: `Cobranca ${suf}`,
                    managerName: 'Rita',
                    managerContact: '11977777777',
                    planId,
                    initialDueDate: dayFrom(-30),
                    adminUsername: `cb${suf}`,
                    adminPassword: 'senha12345'
                },
                201
            )
        ).body;
        const detail = async () =>
            (await http().get(`/admin/restaurants/${r.id}`).set(auth(sa)).expect(200))
                .body;
        expect((await detail()).subscription).toMatchObject({
            state: 'suspended',
            reasons: ['overdue'],
            plan: { id: planId, priceCents: 9900 }
        });

        // the period restarts on the payment day and the amount comes from the plan
        const preview = (
            await http()
                .get(
                    `/admin/restaurants/${r.id}/payments/preview?cycles=1&paidAt=${dayFrom(0)}`
                )
                .set(auth(sa))
                .expect(200)
        ).body;
        expect(preview).toMatchObject({ expectedCents: 9900, restartsFromPayment: true });
        expect(preview.periodStart.slice(0, 10)).toBe(dayFrom(0));
        const bad = await http()
            .post(`/admin/restaurants/${r.id}/payments`)
            .set(auth(sa))
            .send({ cycles: 1, paidAt: dayFrom(0), amountCents: 5000 })
            .expect(400);
        expect(bad.body.details.map(codeOf)).toEqual([
            'note_required',
            'receipt_required'
        ]);
        await http()
            .post(`/admin/restaurants/${r.id}/payments`)
            .set(auth(sa))
            .send({ cycles: 1, paidAt: dayFrom(2) })
            .expect(400);
        const pay = (
            await http()
                .post(`/admin/restaurants/${r.id}/payments`)
                .set(auth(sa))
                .send({
                    cycles: 1,
                    paidAt: dayFrom(0),
                    noReceiptReason: 'Pago em dinheiro'
                })
                .expect(201)
        ).body;
        expect(pay.newDueDate.slice(0, 10)).toBe(addMonth(dayFrom(0)));
        expect((await detail()).subscription).toMatchObject({
            state: 'active',
            reasons: []
        });

        // a manual due date needs a reason and a day that has not passed
        await http()
            .post(`/admin/restaurants/${r.id}/due-date`)
            .set(auth(sa))
            .send({ dueDate: dayFrom(-1), reason: 'Teste' })
            .expect(400);
        const adjusted = (
            await http()
                .post(`/admin/restaurants/${r.id}/due-date`)
                .set(auth(sa))
                .send({ dueDate: dayFrom(90), reason: 'Cortesia de lançamento' })
                .expect(201)
        ).body;
        expect((await detail()).subscription.dueDate.slice(0, 10)).toBe(dayFrom(90));

        // only the latest entry is voided, and the due date steps back each time
        await http()
            .post(`/admin/restaurants/${r.id}/payments/${pay.id}/void`)
            .set(auth(sa))
            .send({ reason: 'Teste' })
            .expect(409);
        await http()
            .post(`/admin/restaurants/${r.id}/payments/${adjusted.id}/void`)
            .set(auth(sa))
            .send({ reason: 'Engano' })
            .expect(201);
        expect((await detail()).subscription.dueDate.slice(0, 10)).toBe(
            addMonth(dayFrom(0))
        );
        await http()
            .patch(`/admin/restaurants/${r.id}/payments/${pay.id}`)
            .set(auth(sa))
            .send({ amountCents: 9000, note: 'Desconto combinado' })
            .expect(200);
        await http()
            .post(`/admin/restaurants/${r.id}/payments/${pay.id}/void`)
            .set(auth(sa))
            .send({ reason: 'Pagamento não compensou' })
            .expect(201);
        expect((await detail()).subscription.state).toBe('suspended');
        const history = (
            await http()
                .get(`/admin/restaurants/${r.id}/payments`)
                .set(auth(sa))
                .expect(200)
        ).body as { voidedAt: string | null; voidReason: string | null }[];
        expect(history.every((h) => h.voidedAt)).toBe(true);
        const log = (
            await http()
                .get(`/admin/restaurants/${r.id}/activity?category=payments`)
                .set(auth(sa))
                .expect(200)
        ).body as { items: { action: string }[] };
        expect(log.items.map((i) => i.action)).toEqual(
            expect.arrayContaining([
                'payment_recorded',
                'payment_edited',
                'payment_voided',
                'due_date_adjusted'
            ])
        );

        // the price signed in the contract stays when the plan's price changes; an amendment changes it, with a reason
        const pricey = (
            await http()
                .post('/admin/plans')
                .set(auth(sa))
                .send({ name: `Mutavel ${suf}`, priceCents: 5000, cycleMonths: 1 })
                .expect(201)
        ).body;
        const signed = (
            await restaurant(
                sa,
                {
                    name: `Assinado ${suf}`,
                    managerName: 'Rita',
                    managerContact: '11977777777',
                    planId: pricey.id,
                    initialDueDate: dayFrom(10),
                    adminUsername: `as${suf}`,
                    adminPassword: 'senha12345'
                },
                201
            )
        ).body;
        await http()
            .patch(`/admin/plans/${pricey.id}`)
            .set(auth(sa))
            .send({ priceCents: 7000 })
            .expect(200);
        const subOf = async () =>
            (
                await http()
                    .get(`/admin/restaurants/${signed.id}`)
                    .set(auth(sa))
                    .expect(200)
            ).body.subscription;
        expect((await subOf()).plan).toMatchObject({ id: pricey.id, priceCents: 5000 });
        await http()
            .patch(`/admin/restaurants/${signed.id}/plan`)
            .set(auth(sa))
            .send({ planId: planId })
            .expect(400);
        await http()
            .patch(`/admin/restaurants/${signed.id}/plan`)
            .set(auth(sa))
            .send({ planId: planId, reason: 'Aditivo assinado' })
            .expect(200);
        expect((await subOf()).plan).toMatchObject({ id: planId, priceCents: 9900 });
        const charged = (
            await http()
                .get(
                    `/admin/restaurants/${signed.id}/payments/preview?cycles=1&paidAt=${dayFrom(0)}`
                )
                .set(auth(sa))
                .expect(200)
        ).body;
        expect(charged.expectedCents).toBe(9900);

        // a plan in use is never deleted; a deactivated one takes no new restaurants
        await http().delete(`/admin/plans/${planId}`).set(auth(sa)).expect(409);
        const spare = (
            await http()
                .post('/admin/plans')
                .set(auth(sa))
                .send({ name: `Avulso ${suf}`, priceCents: 1000, cycleMonths: 1 })
                .expect(201)
        ).body;
        await http()
            .patch(`/admin/plans/${spare.id}`)
            .set(auth(sa))
            .send({ active: false })
            .expect(200);
        await restaurant(
            sa,
            {
                name: `Inativo ${suf}`,
                managerName: 'Rita',
                managerContact: '11977777777',
                planId: spare.id,
                initialDueDate: dayFrom(10),
                adminUsername: `in${suf}`,
                adminPassword: 'senha12345'
            },
            409
        );
        await http().delete(`/admin/plans/${spare.id}`).set(auth(sa)).expect(204);

        // Elo support inside the panel: watches the operation, fixes configuration and passwords
        const rid = (await http().get('/restaurant/me').set(auth(admin)).expect(200)).body
            .id;
        const support = (
            await http()
                .post(`/admin/restaurants/${rid}/access`)
                .set(auth(sa))
                .expect(201)
        ).body.accessToken as string;
        const anyId = '00000000-0000-4000-8000-000000000000';
        await http().get('/orders').set(auth(support)).expect(200);
        await http()
            .post(`/orders/${anyId}/cancel`)
            .set(auth(support))
            .send({ reason: 'Teste' })
            .expect(403);
        await http()
            .post(`/orders/${anyId}/return`)
            .set(auth(support))
            .send({ reason: 'Teste' })
            .expect(403);
        await http().post(`/calls/${anyId}/resolve`).set(auth(support)).expect(403);
        await http()
            .put(`/bills/${anyId}/fee`)
            .set(auth(support))
            .send({ waived: true })
            .expect(403);
        const table = (
            await http()
                .post('/tables')
                .set(auth(support))
                .send({ name: `Suporte ${suf}` })
                .expect(201)
        ).body;
        await http().delete(`/tables/${table.id}`).set(auth(support)).expect(204);
        const team = (await http().get('/staff').set(auth(support)).expect(200)).body as {
            id: string;
            username: string;
        }[];
        const owner = team.find((m) => m.username === `adm${suf}`)!;
        await http()
            .patch(`/staff/${owner.id}/password`)
            .set(auth(support))
            .send({ password: 'senha12345' })
            .expect(204);
        // a password set by someone else ends the owner's sessions: sign in again
        await http().get('/restaurant/me').set(auth(admin)).expect(401);
        admin = await login(`adm${suf}`);
        // the kitchen status belongs to the kitchen, not to the administrator
        await http().patch(`/orders/${anyId}/revert`).set(auth(admin)).expect(403);
        await http()
            .patch(`/orders/${anyId}/status`)
            .set(auth(admin))
            .send({ status: 'received' })
            .expect(403);
    });
});
