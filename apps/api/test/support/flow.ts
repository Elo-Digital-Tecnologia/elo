import type { ApiResponse } from '@elo/core/api/api-response';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Socket } from 'socket.io-client';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { businessDay } from '@elo/core/contracts/contracts';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { beforeAll } from 'vitest';
import { AppModule } from '#/app.module.js';
import { setupApp } from '#/app.setup.js';

/**
 * The suites read `data` (or `error`) straight from `res.body`; the envelope itself is
 * checked in its own test with `raw()`.
 */
const unwrapEnvelope = (res: request.Response) => {
    const body = res.body as Partial<ApiResponse> | undefined;
    if (body && typeof body === 'object' && 'success' in body)
        res.body = body.success ? body.data : body.error;
};
export const codeOf = (detail: { code: string }) => detail.code;
export const fieldsOf = (details: { field: string; code: string; params?: unknown }[]) =>
    Object.fromEntries(details.map(({ field, ...error }) => [field, error]));

export const SUPERADMIN_KEY = process.env['SUPERADMIN_KEY'] ?? '';

/** The suites sign in far more than the login limit allows from one address. */
const unlimited: ThrottlerStorage = {
    increment: async () => ({
        totalHits: 1,
        timeToExpire: 0,
        isBlocked: false,
        timeToBlockExpire: 0
    })
};

async function boot() {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(ThrottlerStorage)
        .useValue(unlimited)
        .compile();
    const app = mod.createNestApplication<NestExpressApplication>({
        logger: ['error', 'warn']
    });
    setupApp(app);
    await app.listen(0);
    return { app: app as INestApplication, url: await app.getUrl() };
}

/**
 * One app per worker, shared by the files it runs (the e2e project does not isolate
 * them): booting Nest and syncing the schema costs more than most tests.
 */
let running: ReturnType<typeof boot> | undefined;
/** Tells apart the data of files that run in the same worker. */
let files = 0;

/**
 * Builds the base restaurant (team, a product and a table) for one e2e file, on the
 * worker's app. Call it inside the file's `describe`; the fixture is ready once
 * `beforeAll` ran.
 */
export function useFlow() {
    let app: INestApplication;
    let url: string;
    const suf = `${Date.now().toString(36)}${++files}`;
    /** Routes live under the global prefix, except the health check and URLs that already carry it. */
    const routeOf = (url: string) => {
        const prefix = `/${process.env['APP_PREFIX'] ?? ''}`.replace(/\/$/, '');
        if (!prefix || url.startsWith('/health') || url.startsWith(`${prefix}/`))
            return url;
        return `${prefix}${url}`;
    };
    const http = () => {
        const agent = request(app.getHttpServer());
        const unwrapped =
            (method: 'get' | 'post' | 'patch' | 'put' | 'delete') => (url: string) =>
                agent[method](routeOf(url)).expect(unwrapEnvelope);
        return {
            get: unwrapped('get'),
            post: unwrapped('post'),
            patch: unwrapped('patch'),
            put: unwrapped('put'),
            delete: unwrapped('delete')
        };
    };
    const raw = () => request(app.getHttpServer());

    const login = async (username: string, inSlug = slug, password = 'senha12345') =>
        (
            await http()
                .post(`/auth/restaurants/${inSlug}/login`)
                .send({ username, password })
        ).body.accessToken as string;

    let admin: string, waiter: string, kitchen: string;
    let slug: string,
        tableId: string,
        tableToken: string,
        productId: string,
        planId: string;
    const today = () => businessDay();

    const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
    let saToken: string | null = null;
    const superadmin = async () =>
        (saToken ??= (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY }))
            .body.accessToken as string);

    /** A signed contract from today for a year, so the restaurant's team and menu are on. */
    const activate = async (restaurantId: string) => {
        const sa = await superadmin();
        const doc = (
            await http()
                .post(`/admin/restaurants/${restaurantId}/documents`)
                .set('Authorization', `Bearer ${sa}`)
                .field('kind', 'contract')
                .attach('file', PDF, 'contrato.pdf')
                .expect(201)
        ).body;
        const start = today();
        const end = `${Number(start.slice(0, 4)) + 1}${start.slice(4)}`;
        await http()
            .post(`/admin/restaurants/${restaurantId}/contracts`)
            .set('Authorization', `Bearer ${sa}`)
            .send({
                kind: 'definitive',
                origin: 'initial',
                signedOn: start,
                startsOn: start,
                endsOn: end,
                signatory: { name: 'Rita Souza', role: 'Sócia', contact: '11977777777' },
                documentId: doc.id
            })
            .expect(201);
    };

    /**
     * Creates a restaurant with a contract in force. Its first due date is `initialDueDate`
     * (two weeks ahead by default), written straight to the database.
     */
    const restaurant = async (
        token: string,
        body: Record<string, unknown>,
        status = 201
    ) => {
        const { initialDueDate, ...rest } = body as { initialDueDate?: string };
        const res = await http()
            .post('/admin/restaurants')
            .set('Authorization', `Bearer ${token}`)
            .send(rest)
            .expect(status);
        if (status === 201) {
            await activate(res.body.id);
            const due =
                initialDueDate ??
                new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
            await app
                .get(DataSource)
                .query(
                    `UPDATE restaurants SET initial_due_date = $2, due_date = $2 WHERE id = $1`,
                    [res.body.id, `${due}T12:00:00Z`]
                );
        }
        return res;
    };

    beforeAll(async () => {
        ({ app, url } = await (running ??= boot()));

        const sa = (await http().post('/auth/superadmin').send({ key: SUPERADMIN_KEY }))
            .body.accessToken;
        planId = (
            await http()
                .post('/admin/plans')
                .set('Authorization', `Bearer ${sa}`)
                .send({ name: `Plano ${suf}`, priceCents: 9900, cycleMonths: 1 })
                .expect(201)
        ).body.id;
        const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
        const r = await restaurant(sa, {
            name: `E2E ${suf}`,
            managerName: 'Maria',
            managerContact: '11999999999',
            planId,
            initialDueDate: due,
            adminUsername: `adm${suf}`,
            adminPassword: 'senha12345'
        });
        slug = r.body.slug;
        admin = await login(`adm${suf}`);
        for (const [u, role] of [
            ['wai', 'waiter'],
            ['kit', 'kitchen']
        ]) {
            await http()
                .post('/staff')
                .set('Authorization', `Bearer ${admin}`)
                .send({
                    username: u + suf,
                    password: 'senha12345',
                    name: `Pessoa ${u}`,
                    roles: [role]
                })
                .expect(201);
        }
        waiter = await login(`wai${suf}`);
        kitchen = await login(`kit${suf}`);
        const cat = await http()
            .post('/catalog/categories')
            .set('Authorization', `Bearer ${admin}`)
            .send({ name: 'Pizzas' })
            .expect(201);
        const prod = await http()
            .post('/catalog/products')
            .set('Authorization', `Bearer ${admin}`)
            .send({ categoryId: cat.body.id, name: 'Margherita', priceCents: 4000 })
            .expect(201);
        productId = prod.body.id;
        const t = await http()
            .post('/tables')
            .set('Authorization', `Bearer ${admin}`)
            .send({ name: 'Mesa 01' })
            .expect(201);
        tableId = t.body.id;
        tableToken = t.body.token;
    });

    const cookieOf = (res: request.Response) =>
        (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    const waitFor = (socket: Socket, event: string) =>
        new Promise<unknown>((resolve, reject) => {
            const t = setTimeout(() => reject(new Error(`timeout ${event}`)), 5000);
            socket.once(event, (p) => {
                clearTimeout(t);
                resolve(p);
            });
        });

    return {
        suf,
        http,
        raw,
        routeOf,
        login,
        superadmin,
        activate,
        restaurant,
        today,
        PDF,
        cookieOf,
        waitFor,
        fixture: () => ({
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
        })
    };
}
