import type { ApiResponse } from '@elo/core/api/api-response';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { beforeAll, describe, expect, it } from 'vitest';
import { SUPERADMIN_KEY, fieldsOf, useFlow } from '../support/flow.js';

describe('API basics and validation (e2e)', () => {
    const flow = useFlow();
    const { routeOf, suf, http, raw, restaurant } = flow;
    let slug: string, admin: string, planId: string;
    beforeAll(() => ({ slug, admin, planId } = flow.fixture()));

    it('health answers without a login while the database is up', async () => {
        expect((await http().get('/health').expect(200)).body).toEqual({ status: 'ok' });
    });

    it('wraps every answer in the envelope, with a code on errors', async () => {
        const ok = (await raw().get('/health').expect(200)).body as ApiResponse;
        expect(ok).toMatchObject({
            success: true,
            path: '/health',
            data: { status: 'ok' },
            error: null
        });
        expect(Date.parse(ok.timestamp)).not.toBeNaN();
        const missing = (await raw().get('/no-such-route').expect(404))
            .body as ApiResponse;
        expect(missing).toMatchObject({
            success: false,
            path: '/no-such-route',
            data: null,
            error: { code: ApiErrorCode.NOT_FOUND, details: [] }
        });
        const unknown = (
            await raw()
                .post(routeOf('/auth/superadmin'))
                .send({ key: 'x', extra: true })
                .expect(400)
        ).body as ApiResponse;
        expect(unknown.error).toMatchObject({
            code: ApiErrorCode.VALIDATION_FAILED,
            details: [{ field: 'extra', code: 'unknown_field' }]
        });
    });

    it('validation: one code per field, blank text refused, limits and sign-in without revealing rules', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const bad = (
            await http()
                .post('/tables')
                .set(auth(admin))
                .send({ name: '    ' })
                .expect(400)
        ).body;
        expect(bad).toEqual({
            code: ApiErrorCode.VALIDATION_FAILED,
            message: 'Validation failed',
            details: [{ field: 'name', code: 'required' }]
        });
        const many = fieldsOf(
            (
                await http()
                    .post('/staff')
                    .set(auth(admin))
                    .send({
                        username: 'Ana Lima',
                        password: 'curta',
                        name: 'Ana 123',
                        roles: ['waiter'],
                        extra: 1
                    })
                    .expect(400)
            ).body.details
        );
        expect(many).toEqual({
            username: { code: 'invalid_username' },
            password: { code: 'too_short', params: { min: 8 } },
            name: { code: 'invalid_name' },
            extra: { code: 'unknown_field' }
        });
        const cat = (
            await http()
                .post('/catalog/categories')
                .set(auth(admin))
                .send({ name: '  Sobremesas   da casa ' })
                .expect(201)
        ).body;
        expect(cat.name).toBe('Sobremesas da casa');
        const tooExpensive = fieldsOf(
            (
                await http()
                    .post('/catalog/products')
                    .set(auth(admin))
                    .send({ categoryId: cat.id, name: 'Caro', priceCents: 1_000_001 })
                    .expect(400)
            ).body.details
        );
        expect(tooExpensive.priceCents).toEqual({
            code: 'too_large',
            params: { max: 1_000_000, money: true }
        });
        const empty = fieldsOf(
            (
                await http()
                    .post('/catalog/products')
                    .set(auth(admin))
                    .send({
                        categoryId: cat.id,
                        name: 'Sem escolha',
                        priceCents: 100,
                        options: [
                            {
                                name: 'Tamanho',
                                required: true,
                                multiple: false,
                                choices: []
                            }
                        ]
                    })
                    .expect(400)
            ).body.details
        );
        expect(empty['options.0.choices']).toEqual({ code: 'too_few' });
        const notes = fieldsOf(
            (
                await http()
                    .post('/catalog/products')
                    .set(auth(admin))
                    .send({
                        categoryId: cat.id,
                        name: 'Foto',
                        priceCents: 100,
                        imageUrl: 'http://exemplo.com/a.png'
                    })
                    .expect(400)
            ).body.details
        );
        expect(notes.imageUrl).toEqual({ code: 'invalid_url' });

        // sign-in never tells the rules: a short password is just wrong
        await http()
            .post(`/auth/restaurants/${slug}/login`)
            .send({ username: 'ab', password: '123' })
            .expect(401);
        await http()
            .post('/auth/restaurants/NAO VALE/login')
            .send({ username: 'ana', password: 'senha12345' })
            .expect(400);

        // a very long name still gives a slug that fits every route
        const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY }))
            .body.accessToken as string;
        const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
        const long = `${suf} Restaurante ${'muito '.repeat(15)}comprido`.slice(0, 118);
        const created = (
            await restaurant(
                sa,
                {
                    name: long,
                    managerName: 'Rita',
                    managerContact: '11977777777',
                    planId,
                    initialDueDate: due,
                    adminUsername: `lg${suf}`,
                    adminPassword: 'senha12345'
                },
                201
            )
        ).body;
        expect(created.slug.length).toBeLessThanOrEqual(60);
        await http().get(`/public/${created.slug}/menu`).expect(200);
        // impossible days and explicit nulls in required settings are refused, not turned into 500s
        expect(
            fieldsOf(
                (
                    await http()
                        .get('/reports?from=2024-13-45&to=2024-13-46')
                        .set(auth(admin))
                        .expect(400)
                ).body.details
            ).from
        ).toEqual({ code: 'invalid_date' });
        const me = (await http().get('/restaurant/me').set(auth(admin)).expect(200)).body;
        const base = {
            name: me.name,
            managerName: me.managerName,
            managerContact: me.managerContact,
            serviceFeeBps: me.serviceFeeBps
        };
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...base, guestFeeRefusal: null })
            .expect(400);
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({
                ...base,
                openingHours: [
                    [{ open: '10:00', close: '22:00', extra: 'x'.repeat(50) }],
                    [],
                    [],
                    [],
                    [],
                    [],
                    []
                ]
            })
            .expect(200);
        expect(
            JSON.stringify(
                (await http().get('/restaurant/me').set(auth(admin)).expect(200)).body
                    .openingHours
            )
        ).not.toContain('extra');
        await http()
            .patch('/restaurant/settings')
            .set(auth(admin))
            .send({ ...base, openingHours: null })
            .expect(200);
        const taken = (
            await http()
                .post('/staff')
                .set(auth(admin))
                .send({
                    username: `wai${suf}`,
                    password: 'senha12345',
                    name: 'Outra Pessoa',
                    roles: ['waiter']
                })
                .expect(409)
        ).body;
        expect(taken).toMatchObject({
            code: ApiErrorCode.USERNAME_TAKEN,
            details: [{ field: 'username' }]
        });
    });
});
