import { beforeAll, describe, expect, it } from 'vitest';
import { SUPERADMIN_KEY, useFlow } from '../support/flow.js';

describe('sign-in sessions and activity (e2e)', () => {
    const flow = useFlow();
    const { suf, http, login, superadmin, restaurant, today, cookieOf } = flow;
    let slug: string, admin: string, planId: string;
    beforeAll(() => ({ slug, admin, planId } = flow.fixture()));

    it('sessions last across tabs, renew by cookie and end on sign-out, new password or deactivation', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const scope = `r:${slug}`;
        await http()
            .post('/staff')
            .set(auth(admin))
            .send({
                username: `ss${suf}`,
                password: 'senha12345',
                name: 'Sara Souza',
                roles: ['waiter']
            })
            .expect(201);
        const signIn = async () => {
            const res = await http()
                .post(`/auth/restaurants/${slug}/login`)
                .send({ username: `ss${suf}`, password: 'senha12345' })
                .expect(201);
            expect(res.headers['set-cookie'][0]).toMatch(
                new RegExp(`^elo_session_r_${slug}=.+HttpOnly`, 'i')
            );
            return { token: res.body.accessToken as string, cookie: cookieOf(res) };
        };
        const renew = (cookie: string, as = scope) =>
            http().post('/auth/session').set('Cookie', cookie).send({ scope: as });

        // a new tab trades the cookie for a token; the cookie of a restaurant does not open another panel
        const phone = await signIn();
        const tab = (await renew(phone.cookie).expect(201)).body.accessToken as string;
        await http().get('/calls').set(auth(tab)).expect(200);
        await renew(phone.cookie, 'admin').expect(401);
        await renew(phone.cookie, 'r:outro-lugar').expect(401);
        await http().post('/auth/session').send({ scope }).expect(401);
        await http().post('/auth/session').send({ scope: 'qualquer' }).expect(400);

        // signing out ends that session and its tokens, not the other devices
        const tablet = await signIn();
        await http()
            .post('/auth/logout')
            .set('Cookie', tablet.cookie)
            .send({ scope })
            .expect(204);
        await renew(tablet.cookie).expect(401);
        await http().get('/calls').set(auth(tablet.token)).expect(401);
        await http().get('/calls').set(auth(phone.token)).expect(200);

        // a new password keeps the device that changed it and ends the others
        const laptop = await signIn();
        await http()
            .patch('/me/password')
            .set(auth(phone.token))
            .send({ current: 'senha12345', next: 'novasenha123' })
            .expect(204);
        await http().get('/calls').set(auth(phone.token)).expect(200);
        await renew(phone.cookie).expect(201);
        await renew(laptop.cookie).expect(401);
        await http().get('/calls').set(auth(laptop.token)).expect(401);

        // the administrator resetting the password ends every session of the member
        const member = (
            await http().get('/staff').set(auth(admin)).expect(200)
        ).body.find((m: { username: string }) => m.username === `ss${suf}`);
        await http()
            .patch(`/staff/${member.id}/password`)
            .set(auth(admin))
            .send({ password: 'senha12345' })
            .expect(204);
        await renew(phone.cookie).expect(401);
        await http().get('/calls').set(auth(phone.token)).expect(401);

        // a member turned off cannot renew either
        const again = await signIn();
        await http()
            .patch(`/staff/${member.id}/active`)
            .set(auth(admin))
            .send({ active: false })
            .expect((r) => expect(r.status).toBeLessThan(300));
        await renew(again.cookie).expect(401);

        // superadmin: same rules, in the Elo panel only
        const sa = await http()
            .post('/auth/superadmin')
            .send({ key: SUPERADMIN_KEY })
            .expect(201);
        expect(
            (await renew(cookieOf(sa), 'admin').expect(201)).body.accessToken
        ).toBeTruthy();
        await renew(cookieOf(sa)).expect(401);
        await http()
            .post('/auth/logout')
            .set('Cookie', cookieOf(sa))
            .send({ scope: 'admin' })
            .expect(204);
        await http().get('/admin/overview').set(auth(sa.body.accessToken)).expect(401);
    });

    it('new address: the old one still leads to the restaurant, stays reserved and the team stays signed in', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const sa = await superadmin();
        const r = (
            await restaurant(sa, {
                name: `Endereco ${suf}`,
                managerName: 'Rita',
                managerContact: '11977777777',
                planId,
                adminUsername: `ed${suf}`,
                adminPassword: 'senha12345'
            })
        ).body;
        const signIn = await http()
            .post(`/auth/restaurants/${r.slug}/login`)
            .send({ username: `ed${suf}`, password: 'senha12345' })
            .expect(201);
        const owner = signIn.body.accessToken as string;
        const table = (
            await http()
                .post('/tables')
                .set(auth(owner))
                .send({ name: 'Mesa 1' })
                .expect(201)
        ).body;
        const next = `novo-${suf}`;

        await http()
            .post(`/admin/restaurants/${r.id}/slug`)
            .set(auth(sa))
            .send({ slug: next })
            .expect(400);
        await http()
            .post(`/admin/restaurants/${r.id}/slug`)
            .set(auth(sa))
            .send({ slug: slug, reason: 'Pedido do titular' })
            .expect(409);
        await http()
            .post(`/admin/restaurants/${r.id}/slug`)
            .set(auth(sa))
            .send({ slug: next, reason: 'Pedido do titular' })
            .expect(201);

        // the old link still opens the menu and a table (printed QR codes), and answers with the current one
        expect(
            (await http().get(`/public/${r.slug}/menu`).expect(200)).body.restaurant.slug
        ).toBe(next);
        await http().post(`/public/${r.slug}/${table.token}/session`).expect(201);
        // the team stays signed in: the old cookie renews under the new link
        const renewed = await http()
            .post('/auth/session')
            .set('Cookie', cookieOf(signIn))
            .send({ scope: `r:${next}` })
            .expect(201);
        expect(String(renewed.headers['set-cookie'])).toContain(`elo_session_r_${next}=`);
        // a panel still open on the old link renews too
        await http()
            .post('/auth/session')
            .set('Cookie', cookieOf(signIn))
            .send({ scope: `r:${r.slug}` })
            .expect(201);
        await http()
            .post(`/auth/restaurants/${r.slug}/login`)
            .send({ username: `ed${suf}`, password: 'senha12345' })
            .expect(201);
        // nobody else can take the old link, and the restaurant can go back to it
        await restaurant(
            sa,
            {
                name: 'Outro',
                slug: r.slug,
                managerName: 'Rita',
                managerContact: '11977777777',
                planId,
                adminUsername: `eo${suf}`,
                adminPassword: 'senha12345'
            },
            409
        );
        await http()
            .post(`/admin/restaurants/${r.id}/slug`)
            .set(auth(sa))
            .send({ slug: r.slug, reason: 'Voltou atrás' })
            .expect(201);
        expect(
            (await http().get(`/public/${next}/menu`).expect(200)).body.restaurant.slug
        ).toBe(r.slug);
        const log = (
            await http()
                .get(`/admin/restaurants/${r.id}/activity?category=settings`)
                .set(auth(sa))
                .expect(200)
        ).body.items as { action: string }[];
        expect(log.filter((l) => l.action === 'slug_changed')).toHaveLength(2);
    });

    it('activity log, field validation and push subscription', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY }))
            .body.accessToken as string;
        const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
        const r = (
            await restaurant(
                sa,
                {
                    name: `Registro ${suf}`,
                    managerName: 'Rita Souza',
                    managerContact: '(11) 97777-7777',
                    planId,
                    initialDueDate: due,
                    adminUsername: `rg${suf}`,
                    adminPassword: 'senha12345'
                },
                201
            )
        ).body;
        const owner = await login(`rg${suf}`, r.slug);

        // fields validated and normalized with the same rules as the form
        const base = {
            name: 'Registro',
            managerName: 'Rita Souza',
            managerContact: '11977777777',
            serviceFeeBps: 1000
        };
        await http()
            .patch('/restaurant/settings')
            .set(auth(owner))
            .send({ ...base, serviceFeeBps: 2500 })
            .expect(400);
        await http()
            .patch('/restaurant/settings')
            .set(auth(owner))
            .send({ ...base, managerContact: '1234' })
            .expect(400);
        await http()
            .patch('/restaurant/settings')
            .set(auth(owner))
            .send({ ...base, managerName: 'Rita 123' })
            .expect(400);
        await http()
            .patch('/restaurant/settings')
            .set(auth(owner))
            .send({ ...base, phone: '11 8123-45' })
            .expect(400);
        const saved = (
            await http()
                .patch('/restaurant/settings')
                .set(auth(owner))
                .send({
                    ...base,
                    phone: '+55 11 4000 1234',
                    instagram: 'https://instagram.com/Casa.Registro/'
                })
                .expect(200)
        ).body;
        expect(saved).toMatchObject({
            managerContact: '(11) 97777-7777',
            phone: '(11) 4000-1234',
            instagram: 'casa.registro'
        });
        expect(
            (
                await http()
                    .patch('/restaurant/settings')
                    .set(auth(owner))
                    .send({ ...base, phone: '', instagram: '' })
                    .expect(200)
            ).body
        ).toMatchObject({ phone: null, instagram: null });

        // team and Elo actions are recorded, with name and origin
        await http()
            .post('/tables')
            .set(auth(owner))
            .send({ name: 'Mesa 9' })
            .expect(201);
        await http()
            .post('/staff')
            .set(auth(owner))
            .send({
                username: `rgw${suf}`,
                password: 'senha12345',
                name: 'Gabi Garçom',
                roles: ['waiter']
            })
            .expect(201);
        await http()
            .post(`/admin/restaurants/${r.id}/payments`)
            .set(auth(sa))
            .send({
                cycles: 1,
                paidAt: today(),
                amountCents: 4990,
                note: 'Desconto de lançamento',
                noReceiptReason: 'Pago em dinheiro'
            })
            .expect(201);
        await http().post(`/admin/restaurants/${r.id}/access`).set(auth(sa)).expect(201);
        const log = (
            await http().get('/restaurant/activity').set(auth(owner)).expect(200)
        ).body as {
            total: number;
            items: {
                action: string;
                actorName: string;
                actorKind: string;
                target: string | null;
                meta: Record<string, unknown> | null;
            }[];
        };
        const byAction = (a: string) => log.items.find((i) => i.action === a);
        expect(byAction('table_created')).toMatchObject({
            actorName: 'Rita Souza',
            actorKind: 'staff',
            target: 'Mesa 9'
        });
        expect(byAction('staff_created')).toMatchObject({
            target: 'Gabi Garçom',
            meta: { roles: ['waiter'] }
        });
        expect(byAction('settings_updated')?.meta).toMatchObject({
            fields: expect.arrayContaining(['phone', 'instagram'])
        });
        expect(JSON.stringify(log)).not.toContain('4000-1234');
        expect(byAction('payment_recorded')).toMatchObject({
            actorName: 'Superadmin',
            actorKind: 'elo',
            meta: { amountCents: 4990 }
        });
        expect(byAction('restaurant_access')).toMatchObject({ actorKind: 'elo' });
        const team = (
            await http()
                .get('/restaurant/activity?category=team')
                .set(auth(owner))
                .expect(200)
        ).body;
        expect(
            team.items.every((i: { action: string }) => i.action.startsWith('staff_'))
        ).toBe(true);
        await http()
            .get('/restaurant/activity?category=nada')
            .set(auth(owner))
            .expect(400);
        const waiterTok = await login(`rgw${suf}`, r.slug);
        await http().get('/restaurant/activity').set(auth(waiterTok)).expect(403);
        await http().get(`/admin/restaurants/${r.id}/activity`).set(auth(sa)).expect(200);
        const outsider = (
            await http()
                .post('/admin/staff')
                .set(auth(sa))
                .send({
                    username: `ou${suf}`,
                    name: 'Otto Leitura',
                    password: 'senha12345',
                    permissions: ['restaurants.view']
                })
                .expect(201)
        ).body;
        expect(outsider.permissions).toEqual(['restaurants.view']);
        const out = (
            await http()
                .post('/auth/team/login')
                .send({ username: `ou${suf}`, password: 'senha12345' })
                .expect(201)
        ).body.accessToken;
        await http()
            .get(`/admin/restaurants/${r.id}/activity`)
            .set(auth(out))
            .expect(403);

        // push: public key (empty without configuration), https endpoints only, one row per device
        expect(
            (await http().get('/push/public-key').set(auth(waiterTok)).expect(200)).body
        ).toHaveProperty('key');
        const keys = { p256dh: 'BOr' + 'a'.repeat(84), auth: 'b'.repeat(22) };
        await http()
            .post('/push/subscriptions')
            .set(auth(waiterTok))
            .send({ endpoint: 'http://push.example/x', keys })
            .expect(400);
        // the server posts to the endpoint: only the browsers' push services are accepted
        await http()
            .post('/push/subscriptions')
            .set(auth(waiterTok))
            .send({ endpoint: 'https://169.254.169.254/latest', keys })
            .expect(400);
        await http()
            .post('/push/subscriptions')
            .set(auth(waiterTok))
            .send({ endpoint: `https://fcm.googleapis.com/fcm/send/${suf}`, keys })
            .expect(204);
        await http()
            .post('/push/subscriptions')
            .set(auth(owner))
            .send({ endpoint: `https://fcm.googleapis.com/fcm/send/${suf}`, keys })
            .expect(204);
        const access = (
            await http()
                .post(`/admin/restaurants/${r.id}/access`)
                .set(auth(sa))
                .expect(201)
        ).body.accessToken;
        await http()
            .post('/push/subscriptions')
            .set(auth(access))
            .send({ endpoint: `https://fcm.googleapis.com/fcm/send/elo${suf}`, keys })
            .expect(403);
        await http()
            .delete('/push/subscriptions')
            .set(auth(owner))
            .send({ endpoint: `https://fcm.googleapis.com/fcm/send/${suf}` })
            .expect(204);
    }, 30_000);
});
