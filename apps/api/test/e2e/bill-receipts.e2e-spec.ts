import { ApiErrorCode } from '@elo/core/api/api-error-code';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { SUPERADMIN_KEY, codeOf, useFlow } from '../support/flow.js';

describe('bill and receipts (e2e)', () => {
    const flow = useFlow();
    const { suf, http, login, restaurant, today, cookieOf } = flow;
    let slug: string,
        admin: string,
        waiter: string,
        kitchen: string,
        tableId: string,
        tableToken: string,
        productId: string,
        planId: string;
    beforeAll(
        () =>
            ({ slug, admin, waiter, kitchen, tableId, tableToken, productId, planId } =
                flow.fixture())
    );

    it('bill: fee refusal, adjustments, return after ready, reports, deactivation, tenant isolation', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        await http()
            .post('/staff')
            .set(auth(admin))
            .send({
                username: 'cax' + suf,
                password: 'senha12345',
                name: 'Caio Caixa',
                roles: ['cashier']
            })
            .expect(201);
        const cashier = await login(`cax${suf}`);

        const s = await http().post(`/public/${slug}/${tableToken}/session`).expect(201);
        const cookie = cookieOf(s);
        await http().post('/public/session/open').set('Cookie', cookie).expect(201);
        await http()
            .post(`/tables/${tableId}/validate-open`)
            .set(auth(waiter))
            .expect(201);
        const o1 = await http()
            .post('/public/session/orders')
            .set('Cookie', cookie)
            .send({ items: [{ productId, quantity: 2 }] })
            .expect(201);
        const o2 = await http()
            .post('/public/session/orders')
            .set('Cookie', cookie)
            .send({ items: [{ productId, quantity: 1 }] })
            .expect(201);

        // a restaurant starts with no service fee and no refusal; the fee is turned on here, with the refusal as a separate choice
        const fresh = (await http().get('/restaurant/me').set(auth(admin)).expect(200))
            .body;
        expect(fresh).toMatchObject({ serviceFeeBps: 0, guestFeeRefusal: false });
        const start = {
            name: fresh.name,
            managerName: fresh.managerName,
            managerContact: fresh.managerContact
        };
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...start, serviceFeeBps: 1000, guestFeeRefusal: false })
            .expect(200);
        expect(
            (await http().get('/public/session').set('Cookie', cookie).expect(200)).body
                .restaurant
        ).toMatchObject({ serviceFeeBps: 1000, guestFeeRefusal: false });
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...start, serviceFeeBps: 1000, guestFeeRefusal: true })
            .expect(200);

        // 3 x R$ 40.00 + 10% service fee
        let bill = (await http().get(`/bills/${tableId}`).set(auth(cashier)).expect(200))
            .body;
        expect(bill).toMatchObject({
            subtotalCents: 12000,
            serviceFeeCents: 1200,
            totalCents: 13200,
            feeWaivedBy: null
        });
        await http().get(`/bills/${tableId}`).set(auth(kitchen)).expect(403);

        // the guest refuses the fee and can only undo their own refusal
        bill = (
            await http()
                .post('/public/session/bill/fee')
                .set('Cookie', cookie)
                .send({ refuse: true })
                .expect(201)
        ).body;
        expect(bill).toMatchObject({
            feeWaivedBy: 'customer',
            serviceFeeCents: 0,
            totalCents: 12000
        });
        bill = (
            await http()
                .post('/public/session/bill/fee')
                .set('Cookie', cookie)
                .send({ refuse: false })
                .expect(201)
        ).body;
        expect(bill).toMatchObject({ feeWaivedBy: null, guestCanRefuseFee: true });
        // the restaurant can take that option away from guests; staff still remove the fee
        const me = (await http().get('/restaurant/me').set(auth(admin)).expect(200)).body;
        const settings = {
            name: me.name,
            managerName: me.managerName,
            managerContact: me.managerContact,
            serviceFeeBps: me.serviceFeeBps
        };
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...settings, guestFeeRefusal: false })
            .expect(200);
        expect(
            (await http().get('/public/session/bill').set('Cookie', cookie).expect(200))
                .body.guestCanRefuseFee
        ).toBe(false);
        expect(
            (
                await http()
                    .post('/public/session/bill/fee')
                    .set('Cookie', cookie)
                    .send({ refuse: true })
                    .expect(403)
            ).body.code
        ).toBe(ApiErrorCode.FEE_REFUSAL_DISABLED);
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...settings, guestFeeRefusal: true })
            .expect(200);
        await http()
            .put(`/bills/${tableId}/fee`)
            .set(auth(waiter))
            .send({ waived: true })
            .expect(200);
        bill = (
            await http()
                .post('/public/session/bill/fee')
                .set('Cookie', cookie)
                .send({ refuse: false })
                .expect(201)
        ).body;
        expect(bill.feeWaivedBy).toBe('staff'); // cliente não desfaz remoção do garçom
        await http()
            .put(`/bills/${tableId}/fee`)
            .set(auth(cashier))
            .send({ waived: false })
            .expect(200);

        // cashier adjustment
        bill = (
            await http()
                .post(`/bills/${tableId}/adjustments`)
                .set(auth(cashier))
                .send({ label: 'Cortesia', cents: -500 })
                .expect(201)
        ).body;
        expect(bill.totalCents).toBe(12700);
        await http()
            .post(`/bills/${tableId}/adjustments`)
            .set(auth(cashier))
            .send({ label: 'Zero', cents: 0 })
            .expect(400);
        bill = (
            await http()
                .delete(`/bills/${tableId}/adjustments/0`)
                .set(auth(cashier))
                .expect(200)
        ).body;
        expect(bill.totalCents).toBe(13200);

        // a cancelled order leaves the bill; returns only after "ready"
        for (const status of ['received', 'preparing', 'ready']) {
            await http()
                .patch(`/orders/${o1.body.id}/status`)
                .set(auth(kitchen))
                .send({ status })
                .expect(200);
        }
        await http()
            .post(`/orders/${o1.body.id}/cancel`)
            .set(auth(waiter))
            .send({ reason: 'motivo valido' })
            .expect(403);
        await http()
            .post(`/orders/${o2.body.id}/return`)
            .set(auth(waiter))
            .send({ reason: 'motivo valido' })
            .expect(403); // ainda não está pronto
        await http()
            .post(`/orders/${o1.body.id}/return`)
            .set(auth(waiter))
            .send({ reason: '' })
            .expect(400);
        await http()
            .post(`/orders/${o1.body.id}/return`)
            .set(auth(kitchen))
            .send({ reason: 'motivo valido' })
            .expect(403);
        const ret = await http()
            .post(`/orders/${o1.body.id}/return`)
            .set(auth(waiter))
            .send({ reason: 'frio demais' })
            .expect(201);
        expect(ret.body.status).toBe('returned');
        bill = (await http().get(`/bills/${tableId}`).set(auth(cashier)).expect(200))
            .body;
        expect(bill.subtotalCents).toBe(4000);

        // order list: validated filter and the "returned" state visible
        await http().get('/orders?status=banana').set(auth(kitchen)).expect(400);
        const listed = await http()
            .get('/orders?status=returned,sent&limit=10')
            .set(auth(kitchen))
            .expect(200);
        expect(listed.body.map((o: { id: string }) => o.id)).toContain(o1.body.id);

        // reports: admin only; returned orders are not revenue
        await http().get('/reports').set(auth(waiter)).expect(403);
        await http().get('/reports?from=2026-13-99').set(auth(admin)).expect(400);
        const rep = (await http().get('/reports').set(auth(admin)).expect(200)).body;
        expect(rep.totals.returned).toBeGreaterThanOrEqual(1);
        expect(rep.totals.revenueCents).toBeGreaterThanOrEqual(4000);
        expect(rep.byHour).toHaveLength(24);
        expect(rep.topProducts[0].name).toBe('Margherita');

        // another restaurant sees none of this
        const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY }))
            .body.accessToken;
        const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
        const outro = await restaurant(
            sa,
            {
                name: `Outro ${suf}`,
                managerName: 'Joao',
                managerContact: '11988888888',
                planId,
                initialDueDate: due,
                adminUsername: `out${suf}`,
                adminPassword: 'senha12345'
            },
            201
        );
        const other = await login(`out${suf}`, outro.body.slug);

        // sign-in is per restaurant: a user of one cannot enter the other, and the same name may exist in both
        await http()
            .post(`/auth/restaurants/${slug}/login`)
            .send({ username: `out${suf}`, password: 'senha12345' })
            .expect(401);
        await http()
            .post(`/auth/restaurants/${outro.body.slug}/login`)
            .send({ username: `adm${suf}`, password: 'senha12345' })
            .expect(401);
        await http()
            .post('/auth/restaurants/nao-existe/login')
            .send({ username: `adm${suf}`, password: 'senha12345' })
            .expect(401);
        await http()
            .post('/auth/team/login')
            .send({ username: `adm${suf}`, password: 'senha12345' })
            .expect(401);
        await http()
            .post('/staff')
            .set(auth(other))
            .send({
                username: `adm${suf}`,
                password: 'senha12345',
                name: 'Outro Garçom',
                roles: ['waiter']
            })
            .expect(201);
        await http()
            .post('/staff')
            .set(auth(other))
            .send({
                username: `adm${suf}`,
                password: 'senha12345',
                name: 'Outro Garçom',
                roles: ['waiter']
            })
            .expect(409);
        expect(await login(`adm${suf}`, outro.body.slug)).toBeTruthy();
        // Elo team access to a restaurant: needs the permission, acts as admin, cannot touch passwords and is audited
        const eloUser = `elo${suf}`;
        await http()
            .post('/admin/staff')
            .set(auth(sa))
            .send({
                username: eloUser,
                name: 'Equipe Elo',
                password: 'senha12345',
                permissions: ['restaurants.view']
            })
            .expect(201);
        const eloToken = (
            await http()
                .post('/auth/team/login')
                .send({ username: eloUser, password: 'senha12345' })
                .expect(201)
        ).body.accessToken;
        const rid = (await http().get('/restaurant/me').set(auth(admin)).expect(200)).body
            .id;
        await http()
            .post(`/admin/restaurants/${rid}/access`)
            .set(auth(eloToken))
            .expect(403);
        const access = await http()
            .post(`/admin/restaurants/${rid}/access`)
            .set(auth(sa))
            .expect(201);
        expect(access.body.slug).toBe(slug);
        await http().get('/restaurant/me').set(auth(access.body.accessToken)).expect(200);
        await http().get('/tables').set(auth(access.body.accessToken)).expect(200);
        await http()
            .patch('/me/password')
            .set(auth(access.body.accessToken))
            .send({ current: 'senha12345', next: 'outrasenha123' })
            .expect(403);
        // the superadmin has no user row and can still record a payment
        await http()
            .post(`/admin/restaurants/${rid}/payments`)
            .set(auth(sa))
            .send({ cycles: 1, paidAt: today(), noReceiptReason: 'Pago em dinheiro' })
            .expect(201);
        const paid = (
            await http()
                .get(`/admin/restaurants/${rid}/payments`)
                .set(auth(sa))
                .expect(200)
        ).body;
        expect(paid[0]).toMatchObject({
            kind: 'payment',
            amountCents: 9900,
            recordedByName: 'Superadmin'
        });
        // a reserved slug never becomes a restaurant
        await restaurant(
            sa,
            {
                name: 'Admin',
                managerName: 'Joao',
                managerContact: '11988888888',
                planId,
                initialDueDate: due,
                adminUsername: `res${suf}`,
                adminPassword: 'senha12345'
            },
            409
        );
        await http().get(`/bills/${tableId}`).set(auth(other)).expect(404);
        const otherRep = (await http().get('/reports').set(auth(other)).expect(200)).body;
        expect(otherRep.totals).toMatchObject({
            revenueCents: 0,
            orders: 0,
            returned: 0
        });
        expect((await http().get('/orders').set(auth(other)).expect(200)).body).toEqual(
            []
        );

        // settings: the slug does not change; the fee is capped
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({
                name: 'Novo nome',
                managerName: 'Maria',
                managerContact: '11999999999',
                serviceFeeBps: 5000
            })
            .expect(400);
        const st = await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({
                name: 'Novo nome',
                managerName: 'Maria',
                managerContact: '11999999999',
                serviceFeeBps: 500
            })
            .expect(200);
        expect(st.body).toMatchObject({ slug, name: 'Novo nome', serviceFeeBps: 500 });
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({
                name: 'x',
                slug: 'hack',
                managerName: 'Maria',
                managerContact: '11999999999',
                serviceFeeBps: 500
            })
            .expect(400);

        // password change, and a deactivated user loses access
        await http()
            .patch('/me/password')
            .set(auth(cashier))
            .send({ current: 'errada1234', next: 'novasenha123' })
            .expect(401);
        await http()
            .patch('/me/password')
            .set(auth(cashier))
            .send({ current: 'senha12345', next: 'novasenha123' })
            .expect(204);
        await http()
            .post(`/auth/restaurants/${slug}/login`)
            .send({ username: `cax${suf}`, password: 'novasenha123' })
            .expect(201);
        const staff = (await http().get('/staff').set(auth(admin)).expect(200)).body as {
            id: string;
            username: string;
        }[];
        const cashierId = staff.find((u) => u.username === `cax${suf}`)!.id;
        await http()
            .patch(`/staff/${cashierId}/active`)
            .set(auth(admin))
            .send({ active: false })
            .expect(200);
        await http().get(`/bills/${tableId}`).set(auth(cashier)).expect(401);

        await http().post(`/tables/${tableId}/close`).set(auth(waiter)).expect(201);
    }, 30_000);

    it('receipts: private file, of a single payment and the same restaurant, or the reason for none', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY }))
            .body.accessToken as string;
        const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
        const make = async (name: string, user: string) =>
            (
                await restaurant(
                    sa,
                    {
                        name: `${name} ${suf}`,
                        managerName: 'Rita',
                        managerContact: '11977777777',
                        planId,
                        initialDueDate: due,
                        adminUsername: user + suf,
                        adminPassword: 'senha12345'
                    },
                    201
                )
            ).body as { id: string };
        const [a, b] = [await make('Recibo A', 'ra'), await make('Recibo B', 'rb')];
        const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
        const send = (rid: string, file: Buffer, name: string, kind = 'receipt') =>
            http()
                .post(`/admin/restaurants/${rid}/documents`)
                .set(auth(sa))
                .field('kind', kind)
                .attach('file', file, name);

        await send(a.id, Buffer.from('<html>oi</html>'), 'falso.pdf').expect(400);
        await send(a.id, pdf, 'x.pdf', 'outro').expect(400);
        const doc = (await send(a.id, pdf, 'comprovante.pdf').expect(201)).body;
        expect(doc).toMatchObject({
            kind: 'receipt',
            name: 'comprovante.pdf',
            mime: 'application/pdf'
        });
        const jpg = await sharp({
            create: { width: 40, height: 40, channels: 3, background: '#2e7d32' }
        })
            .jpeg()
            .withMetadata()
            .toBuffer();
        const photo = (await send(a.id, jpg, 'foto.jpg').expect(201)).body;
        expect(photo.mime).toBe('image/jpeg');

        // proof or reason, not neither and not both; a proof of another restaurant is refused
        const pay = (body: Record<string, unknown>, rid = a.id) =>
            http()
                .post(`/admin/restaurants/${rid}/payments`)
                .set(auth(sa))
                .send({ cycles: 1, paidAt: today(), ...body });
        expect((await pay({}).expect(400)).body.details.map(codeOf)).toEqual([
            'receipt_required'
        ]);
        expect(
            (
                await pay({
                    receiptId: doc.id,
                    noReceiptReason: 'Pago em dinheiro'
                }).expect(400)
            ).body.details.map(codeOf)
        ).toEqual(['receipt_or_reason']);
        await pay({ receiptId: doc.id }, b.id).expect(400);
        const paid = (await pay({ receiptId: doc.id }).expect(201)).body;
        expect(paid.receipt).toMatchObject({ id: doc.id, name: 'comprovante.pdf' });
        expect((await pay({ receiptId: doc.id }).expect(409)).body).toMatchObject({
            code: ApiErrorCode.RECEIPT_IN_USE,
            details: [{ field: 'receiptId' }]
        });

        // a payment without proof gets one later, and keeps it
        const cash = (
            await pay({ noReceiptReason: 'Pago em dinheiro no balcão' }).expect(201)
        ).body;
        expect(cash).toMatchObject({
            receipt: null,
            noReceiptReason: 'Pago em dinheiro no balcão'
        });
        const fixed = (
            await http()
                .patch(`/admin/restaurants/${a.id}/payments/${cash.id}`)
                .set(auth(sa))
                .send({ receiptId: photo.id })
                .expect(200)
        ).body;
        expect(fixed).toMatchObject({ receipt: { id: photo.id }, noReceiptReason: null });

        // only the team with the right permission opens the file, never cached, never run as a page
        const file = await http()
            .get(`/admin/documents/${doc.id}`)
            .set(auth(sa))
            .expect(200);
        expect(file.headers['content-type']).toBe('application/pdf');
        expect(file.headers['x-content-type-options']).toBe('nosniff');
        expect(file.headers['cache-control']).toContain('no-store');
        await http()
            .post('/admin/staff')
            .set(auth(sa))
            .send({
                username: `rv${suf}`,
                name: 'Vera Leitura',
                password: 'senha12345',
                permissions: ['restaurants.view']
            })
            .expect(201);
        const viewer = (
            await http()
                .post('/auth/team/login')
                .send({ username: `rv${suf}`, password: 'senha12345' })
                .expect(201)
        ).body.accessToken as string;
        await http().get(`/admin/documents/${doc.id}`).set(auth(viewer)).expect(403);
        await http().get(`/admin/documents/${doc.id}`).expect(401);
    });
});
