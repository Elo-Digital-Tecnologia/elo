import type { INestApplication } from '@nestjs/common';
import { businessDay } from '@elo/core/contracts/contracts';
import sharp from 'sharp';
import { DataSource } from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';
import { AuditLogCleanupService } from '#/modules/audit-logs/audit-log-cleanup.service.js';
import { SUPERADMIN_KEY, useFlow } from '../support/flow.js';

describe('catalog and public pages (e2e)', () => {
    const flow = useFlow();
    const { suf, http, login, restaurant, cookieOf } = flow;
    let app: INestApplication,
        slug: string,
        admin: string,
        waiter: string,
        tableId: string,
        tableToken: string,
        planId: string;
    beforeAll(
        () => ({ app, slug, admin, waiter, tableId, tableToken, planId } = flow.fixture())
    );

    it('image library: validates the content, converts, serves and protects what is in use', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const png = await sharp({
            create: { width: 1600, height: 900, channels: 3, background: '#2e7d32' }
        })
            .png()
            .toBuffer();

        // only the admin uploads; a fake file with an image extension is refused
        await http()
            .post('/catalog/media')
            .set(auth(waiter))
            .attach('file', png, 'a.png')
            .expect(403);
        await http()
            .post('/catalog/media')
            .set(auth(admin))
            .attach('file', Buffer.from('isto não é uma imagem'), 'falso.png')
            .expect(400);
        await http().post('/catalog/media').set(auth(admin)).expect(400);
        await http()
            .post('/catalog/media')
            .set(auth(admin))
            .attach('file', Buffer.alloc(5 * 1024 * 1024 + 10), 'grande.png')
            .expect(413);

        const up = await http()
            .post('/catalog/media')
            .set(auth(admin))
            .attach('file', png, 'prato.png')
            .expect(201);
        expect(up.body).toMatchObject({ width: 1200, height: 675 });
        const main = await http().get(up.body.url.replace('/api', '')).expect(200);
        expect(main.headers['content-type']).toContain('image/webp');
        const thumb = await http().get(up.body.thumbUrl.replace('/api', '')).expect(200);
        expect(thumb.headers['content-type']).toContain('image/webp');
        await http().get('/media/..%2F..%2Fpackage.json').expect(404);
        await http()
            .get(`/media/${'0'.repeat(8)}-0000-0000-0000-${'0'.repeat(12)}.webp`)
            .expect(404);
        expect(
            (await http().get('/catalog/media').set(auth(admin)).expect(200)).body.map(
                (m: { id: string }) => m.id
            )
        ).toContain(up.body.id);

        // a product uses the library image; while in use it cannot be deleted
        const cat = await http()
            .post('/catalog/categories')
            .set(auth(admin))
            .send({ name: 'Com foto' })
            .expect(201);
        const prod = await http()
            .post('/catalog/products')
            .set(auth(admin))
            .send({
                categoryId: cat.body.id,
                name: 'Prato',
                priceCents: 1000,
                imageUrl: up.body.url
            })
            .expect(201);
        await http()
            .post('/catalog/products')
            .set(auth(admin))
            .send({
                categoryId: cat.body.id,
                name: 'Ruim',
                priceCents: 1000,
                imageUrl: 'javascript:alert(1)'
            })
            .expect(400);
        await http().delete(`/catalog/media/${up.body.id}`).set(auth(admin)).expect(409);
        await http()
            .delete(`/catalog/products/${prod.body.id}`)
            .set(auth(admin))
            .expect(204);
        await http().delete(`/catalog/media/${up.body.id}`).set(auth(admin)).expect(204);
        await http().get(up.body.url.replace('/api', '')).expect(404);
    }, 30_000);

    it('public profile, tags, order and review', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const base = {
            name: 'Perfil',
            managerName: 'Maria',
            managerContact: '11999999999',
            serviceFeeBps: 500
        };

        // profile: validates the format and clears with empty text
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...base, phone: 'abc' })
            .expect(400);
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...base, instagram: 'com espaço' })
            .expect(400);
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...base, logoUrl: 'javascript:alert(1)' })
            .expect(400);
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...base, openingHours: [[], []] })
            .expect(400);
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({
                ...base,
                openingHours: [
                    [],
                    [{ open: '25:00', close: '23:00' }],
                    [],
                    [],
                    [],
                    [],
                    []
                ]
            })
            .expect(400);
        // the old shape (one shift or null per day) is no longer accepted
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({
                ...base,
                openingHours: [
                    null,
                    { open: '10:00', close: '22:00' },
                    null,
                    null,
                    null,
                    null,
                    null
                ]
            })
            .expect(400);
        // shifts of a day cannot overlap, and only the last may pass midnight
        const lunch = { open: '11:00', close: '15:00' };
        const overlapping = await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({
                ...base,
                openingHours: [
                    [],
                    [lunch, { open: '14:00', close: '20:00' }],
                    [],
                    [],
                    [],
                    [],
                    []
                ]
            })
            .expect(400);
        expect(JSON.stringify(overlapping.body)).toContain('openingHours');
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({
                ...base,
                openingHours: [
                    [],
                    [
                        { open: '11:00', close: '02:00' },
                        { open: '18:00', close: '23:00' }
                    ],
                    [],
                    [],
                    [],
                    [],
                    []
                ]
            })
            .expect(400);
        // same open and close time: a shift around the clock
        const day = { open: '00:00', close: '00:00' };
        const saved = await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({
                ...base,
                description: 'Pizzas no forno a lenha.',
                address: 'Rua das Flores, 100',
                phone: '(11) 4000-1234',
                instagram: '@casaverde',
                wifiName: 'Casa Verde',
                wifiPassword: 'segredo-wifi-123',
                openingHours: [[day], [day], [day], [day], [day], [day], [day]]
            })
            .expect(200);
        expect(saved.body).toMatchObject({
            description: 'Pizzas no forno a lenha.',
            wifiName: 'Casa Verde',
            availability: { open: true, reason: null }
        });
        // a day with a break: lunch and dinner are kept as two shifts, in order
        const dinner = { open: '18:00', close: '23:00' };
        const split = await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...base, openingHours: [[], [lunch, dinner], [], [], [], [], []] })
            .expect(200);
        expect(split.body.openingHours).toEqual([
            [],
            [lunch, dinner],
            [],
            [],
            [],
            [],
            []
        ]);
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({
                ...base,
                openingHours: [[day], [day], [day], [day], [day], [day], [day]]
            })
            .expect(200);

        // the Google review link: only Google addresses over https, shown in the public profile, cleared with an empty text
        const google = 'https://g.page/r/CxYz123/review';
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...base, googleReviewUrl: 'https://exemplo.com/avaliar' })
            .expect(400);
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...base, googleReviewUrl: 'http://g.page/r/x' })
            .expect(400);
        const withGoogle = await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...base, googleReviewUrl: google })
            .expect(200);
        expect(withGoogle.body.googleReviewUrl).toBe(google);
        const slugOf = withGoogle.body.slug as string;
        expect(
            (await http().get(`/public/${slugOf}/menu`).expect(200)).body.restaurant
                .googleReviewUrl
        ).toBe(google);
        expect(
            (
                await http()
                    .patch('/restaurant/settings')
                    .set(auth(admin))
                    .send({ ...base, googleReviewUrl: '' })
                    .expect(200)
            ).body.googleReviewUrl
        ).toBeNull();

        // the read-only link shows the profile, but never the Wi-Fi
        const pub = await http().get(`/public/${slug}/menu`).expect(200);
        expect(pub.body.restaurant).toMatchObject({
            description: 'Pizzas no forno a lenha.',
            phone: '(11) 4000-1234',
            availability: { open: true }
        });
        expect(JSON.stringify(pub.body)).not.toContain('segredo-wifi-123');

        // at the table the Wi-Fi shows up
        const sess = await http()
            .post(`/public/${slug}/${tableToken}/session`)
            .expect(201);
        const cookie = (sess.headers['set-cookie'] as unknown as string[])
            .map((c) => c.split(';')[0])
            .join('; ');
        expect(sess.body.restaurant.wifi).toEqual({
            name: 'Casa Verde',
            password: 'segredo-wifi-123'
        });

        // limpar campos
        const cleared = await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...base, description: '', phone: null })
            .expect(200);
        expect(cleared.body).toMatchObject({
            description: null,
            phone: null,
            address: 'Rua das Flores, 100'
        });

        // etiquetas e destaque
        const cat = await http()
            .post('/catalog/categories')
            .set(auth(admin))
            .send({ name: 'Ordem A' })
            .expect(201);
        const cat2 = await http()
            .post('/catalog/categories')
            .set(auth(admin))
            .send({ name: 'Ordem B' })
            .expect(201);
        const p = (name: string, extra: object = {}) =>
            http()
                .post('/catalog/products')
                .set(auth(admin))
                .send({ categoryId: cat.body.id, name, priceCents: 1000, ...extra });
        await p('Inválido', { tags: ['inexistente'] }).expect(400);
        await p('Repetido', { tags: ['spicy', 'spicy'] }).expect(400);
        const a = (
            await p('Alfa', { featured: true, tags: ['spicy', 'new'] }).expect(201)
        ).body;
        const b = (await p('Beta').expect(201)).body;
        const c = (await p('Gama').expect(201)).body;
        expect(a).toMatchObject({ featured: true, tags: ['spicy', 'new'] });

        // product order: must list all of them, only from the restaurant
        await http()
            .patch('/catalog/products/order')
            .set(auth(admin))
            .send({ categoryId: cat.body.id, ids: [c.id, a.id] })
            .expect(400);
        await http()
            .patch('/catalog/products/order')
            .set(auth(admin))
            .send({
                categoryId: cat.body.id,
                ids: [c.id, a.id, 'e1f5b8d0-0000-4000-8000-000000000000']
            })
            .expect(400);
        await http()
            .patch('/catalog/products/order')
            .set(auth(admin))
            .send({ categoryId: cat.body.id, ids: [c.id, a.id, b.id] })
            .expect(204);
        const menu = (await http().get('/catalog').set(auth(admin)).expect(200)).body as {
            id: string;
            products: { id: string }[];
        }[];
        expect(menu.find((x) => x.id === cat.body.id)!.products.map((x) => x.id)).toEqual(
            [c.id, a.id, b.id]
        );

        // category order: full list
        const all = menu.map((x) => x.id);
        await http()
            .patch('/catalog/categories/order')
            .set(auth(admin))
            .send({ ids: all.slice(1) })
            .expect(400);
        const reversed = [...all].reverse();
        await http()
            .patch('/catalog/categories/order')
            .set(auth(admin))
            .send({ ids: reversed })
            .expect(204);
        expect(
            (
                (await http().get('/catalog').set(auth(admin)).expect(200)).body as {
                    id: string;
                }[]
            ).map((x) => x.id)
        ).toEqual(reversed);
        await http()
            .patch('/catalog/products/order')
            .set(auth(waiter))
            .send({ categoryId: cat.body.id, ids: [a.id] })
            .expect(403);
        expect(cat2.body.id).toBeTruthy();

        // review: needs an open table, 1 to 5, one per session
        await http()
            .post('/public/session/review')
            .set('Cookie', cookie)
            .send({ stars: 5 })
            .expect(400);
        await http().post('/public/session/open').set('Cookie', cookie).expect(201);
        await http()
            .post(`/tables/${tableId}/validate-open`)
            .set(auth(waiter))
            .expect(201);
        await http()
            .post('/public/session/review')
            .set('Cookie', cookie)
            .send({ stars: 0 })
            .expect(400);
        await http()
            .post('/public/session/review')
            .set('Cookie', cookie)
            .send({ stars: 6 })
            .expect(400);
        await http().post('/public/session/review').send({ stars: 5 }).expect(401);
        await http()
            .post('/public/session/review')
            .set('Cookie', cookie)
            .send({ stars: 4, comment: 'Bom' })
            .expect(201);
        await http()
            .post('/public/session/review')
            .set('Cookie', cookie)
            .send({ stars: 5, comment: '  Ótimo  ' })
            .expect(201);
        expect(
            (await http().get('/public/session/review').set('Cookie', cookie).expect(200))
                .body
        ).toMatchObject({ stars: 5, comment: 'Ótimo' });
        const sum = (await http().get('/reviews').set(auth(admin)).expect(200)).body;
        expect(sum).toMatchObject({ count: 1, average: 5 });
        expect(sum.reviews[0]).toMatchObject({
            stars: 5,
            comment: 'Ótimo',
            tableName: 'Mesa 01'
        });
        await http().get('/reviews').set(auth(waiter)).expect(403);
        await http().post(`/tables/${tableId}/close`).set(auth(waiter)).expect(201);
    }, 30_000);

    it('order history by role, profile photo and cleanup of old records', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY }))
            .body.accessToken as string;
        const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
        const r = (
            await restaurant(
                sa,
                {
                    name: `Historico ${suf}`,
                    managerName: 'Rita',
                    managerContact: '11977777777',
                    planId,
                    initialDueDate: due,
                    adminUsername: `hi${suf}`,
                    adminPassword: 'senha12345'
                },
                201
            )
        ).body;
        const owner = await login(`hi${suf}`, r.slug);
        const w = (
            await http()
                .post('/staff')
                .set(auth(owner))
                .send({
                    username: `hw${suf}`,
                    password: 'senha12345',
                    name: 'Helena Garcom',
                    roles: ['waiter']
                })
                .expect(201)
        ).body;
        const waiterH = await login(`hw${suf}`, r.slug);
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
        const t = (
            await http()
                .post('/tables')
                .set(auth(owner))
                .send({ name: 'Mesa H' })
                .expect(201)
        ).body;
        const guest = cookieOf(
            await http().post(`/public/${r.slug}/${t.token}/session`).expect(201)
        );
        await http().post('/public/session/open').set('Cookie', guest).expect(201);
        await http().post(`/tables/${t.id}/validate-open`).set(auth(waiterH)).expect(201);
        await http()
            .post('/public/session/orders')
            .set('Cookie', guest)
            .send({ items: [{ productId: prod.id, quantity: 2 }] })
            .expect(201);

        // an old order: the waiter's window does not reach it, the owner's does
        const db = app.get(DataSource);
        const order = (
            await http()
                .post('/public/session/orders')
                .set('Cookie', guest)
                .send({ items: [{ productId: prod.id, quantity: 1 }] })
                .expect(201)
        ).body;
        await db.query(
            `UPDATE orders SET created_at = now() - interval '10 days' WHERE id = $1`,
            [order.id]
        );
        const full = (await http().get('/orders/history').set(auth(owner)).expect(200))
            .body;
        expect(full).toMatchObject({ total: 2, limitedFrom: null });
        expect(full.items[0]).toMatchObject({
            tableName: 'Mesa H',
            totalCents: 1800,
            servedBy: 'Helena Garcom',
            closedAt: null
        });
        const recent = (
            await http().get('/orders/history').set(auth(waiterH)).expect(200)
        ).body;
        expect(recent.total).toBe(1);
        expect(recent.limitedFrom).not.toBeNull();
        const old = businessDay(new Date(Date.now() - 10 * 86_400_000));
        expect(
            (
                await http()
                    .get(`/orders/history?from=${old}&to=${old}`)
                    .set(auth(owner))
                    .expect(200)
            ).body.total
        ).toBe(1);
        await http().get('/orders/history?from=ontem').set(auth(owner)).expect(400);

        // profile photo: own or set by a lead, never by a waiter for someone else; shown to the team only
        const png = await sharp({
            create: { width: 600, height: 400, channels: 3, background: '#2e7d32' }
        })
            .png()
            .toBuffer();
        const mine = (
            await http()
                .post('/me/avatar')
                .set(auth(waiterH))
                .attach('file', png, 'eu.png')
                .expect(201)
        ).body;
        expect(mine.avatarUrl).toMatch(/^\/api\/media\/[0-9a-f-]{36}\.webp$/);
        expect(
            (await http().get('/me').set(auth(waiterH)).expect(200)).body.avatarUrl
        ).toBe(mine.avatarUrl);
        const ownerId = (
            (await http().get('/staff').set(auth(owner)).expect(200)).body as {
                id: string;
                username: string;
            }[]
        ).find((u) => u.username === `hi${suf}`)!.id;
        await http()
            .post(`/staff/${ownerId}/avatar`)
            .set(auth(waiterH))
            .attach('file', png, 'x.png')
            .expect(403);
        await http()
            .post(`/staff/${w.id}/avatar`)
            .set(auth(owner))
            .attach('file', Buffer.from('nada'), 'x.png')
            .expect(400);
        await http().delete(`/staff/${w.id}/avatar`).set(auth(owner)).expect(204);
        expect(
            (
                (await http().get('/staff').set(auth(owner)).expect(200)).body as {
                    id: string;
                    avatarUrl: string | null;
                }[]
            ).find((u) => u.id === w.id)?.avatarUrl
        ).toBeNull();
        await http().get(mine.avatarUrl).expect(404);

        // old activity entries are erased by the scheduled cleanup; recent ones stay
        const [{ id: oldLog }] = await db.query(
            `INSERT INTO audit_logs (actor, actor_name, actor_kind, action, restaurant_id, created_at) VALUES ('system', 'Sistema', 'system', 'settings_updated', $1, now() - interval '400 days') RETURNING id`,
            [r.id]
        );
        expect(await app.get(AuditLogCleanupService).run()).toBeGreaterThanOrEqual(1);
        expect(
            await db.query(`SELECT 1 FROM audit_logs WHERE id = $1`, [oldLog])
        ).toHaveLength(0);
        expect(
            (await http().get('/restaurant/activity').set(auth(owner)).expect(200)).body
                .total
        ).toBeGreaterThan(0);
    });
});
