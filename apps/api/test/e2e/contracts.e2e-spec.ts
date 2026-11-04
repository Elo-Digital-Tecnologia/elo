import type { INestApplication } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { DataSource } from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';
import { codeOf, useFlow } from '../support/flow.js';

describe('contracts (e2e)', () => {
    const flow = useFlow();
    const { suf, http, login, superadmin, today, PDF, cookieOf } = flow;
    let app: INestApplication, planId: string;
    beforeAll(() => ({ app, planId } = flow.fixture()));

    it('contracts: pending, pilot trial, conversion, renewal with a gap, void and end', async () => {
        const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
        const sa = await superadmin();
        const db = app.get(DataSource);
        const day = (n: number) =>
            new Date(Date.parse(`${today()}T12:00:00Z`) + n * 86_400_000)
                .toISOString()
                .slice(0, 10);
        const create = async (name: string, user: string) =>
            (
                await http()
                    .post('/admin/restaurants')
                    .set(auth(sa))
                    .send({
                        name: `${name} ${suf}`,
                        managerName: 'Rita',
                        managerContact: '11977777777',
                        planId,
                        adminUsername: user + suf,
                        adminPassword: 'senha12345'
                    })
                    .expect(201)
            ).body as { id: string; slug: string };
        const upload = async (rid: string) =>
            (
                await http()
                    .post(`/admin/restaurants/${rid}/documents`)
                    .set(auth(sa))
                    .field('kind', 'contract')
                    .attach('file', PDF, 'contrato.pdf')
                    .expect(201)
            ).body.id as string;
        const signatory = { name: 'Rita Souza', role: 'Sócia', contact: '11977777777' };
        const contract = (rid: string, body: Record<string, unknown>) =>
            http()
                .post(`/admin/restaurants/${rid}/contracts`)
                .set(auth(sa))
                .send({ signatory, signedOn: day(0), ...body });
        const subOf = async (rid: string) =>
            (await http().get(`/admin/restaurants/${rid}`).set(auth(sa)).expect(200)).body
                .subscription;
        const inList = async (status: string, name: string) =>
            (
                (
                    await http()
                        .get(
                            `/admin/restaurants?status=${status}&q=${encodeURIComponent(name)}`
                        )
                        .set(auth(sa))
                        .expect(200)
                ).body.items as { id: string }[]
            ).map((x) => x.id);

        // pending: its own status (not "suspended"), no billing yet, the team locked out with the reason, no menu
        const r = await create('Contrato', 'ct');
        const pending = await subOf(r.id);
        expect(pending).toMatchObject({
            status: 'pending',
            reasons: ['contract_pending'],
            trial: { state: 'none' }
        });
        expect(await inList('pending', `Contrato ${suf}`)).toEqual([r.id]);
        expect(await inList('suspended', `Contrato ${suf}`)).toEqual([]);
        const owner = await login(`ct${suf}`, r.slug);
        expect(
            (await http().get('/catalog').set(auth(owner)).expect(403)).body
        ).toMatchObject({
            code: ApiErrorCode.SUBSCRIPTION_SUSPENDED,
            details: [{ reasons: ['contract_pending'] }]
        });
        expect((await http().get(`/public/${r.slug}/menu`).expect(404)).body.code).toBe(
            ApiErrorCode.MENU_UNAVAILABLE
        );
        // billing starts with the contract: nothing is paid or rescheduled before it
        expect(
            (
                await http()
                    .post(`/admin/restaurants/${r.id}/payments`)
                    .set(auth(sa))
                    .send({
                        cycles: 1,
                        paidAt: day(0),
                        noReceiptReason: 'Pago em dinheiro'
                    })
                    .expect(409)
            ).body.code
        ).toBe(ApiErrorCode.CONTRACT_PENDING);
        await http()
            .post(`/admin/restaurants/${r.id}/due-date`)
            .set(auth(sa))
            .send({ dueDate: day(10), reason: 'Combinado' })
            .expect(409);
        // a manual suspension only takes away an access the team still has
        expect(
            (
                await http()
                    .post(`/admin/restaurants/${r.id}/suspend`)
                    .set(auth(sa))
                    .expect(409)
            ).body.code
        ).toBe(ApiErrorCode.NOTHING_TO_SUSPEND);
        expect(await inList('pending', `Contrato ${suf}`)).toEqual([r.id]);
        expect(
            (
                await http()
                    .get(
                        `/admin/restaurants?dueWithin=7&q=${encodeURIComponent(`Contrato ${suf}`)}`
                    )
                    .set(auth(sa))
                    .expect(200)
            ).body.items
        ).toEqual([]);

        // only a first pilot carries a trial; a file of another restaurant is refused; two first contracts at once make one
        const other = await create('Outro contrato', 'oc');
        await contract(r.id, {
            kind: 'pilot',
            origin: 'initial',
            startsOn: day(0),
            endsOn: day(60),
            documentId: await upload(other.id)
        }).expect(400);
        expect(
            (
                await contract(r.id, {
                    kind: 'definitive',
                    origin: 'initial',
                    startsOn: day(0),
                    endsOn: day(60),
                    trialDays: 7,
                    documentId: await upload(r.id)
                }).expect(400)
            ).body.details.map(codeOf)
        ).toEqual(['trial_only_initial_pilot']);
        const [d1, d2] = [await upload(r.id), await upload(r.id)];
        const both = await Promise.all(
            [d1, d2].map((documentId) =>
                contract(r.id, {
                    kind: 'pilot',
                    origin: 'initial',
                    startsOn: day(0),
                    endsOn: day(60),
                    trialDays: 7,
                    documentId
                })
            )
        );
        expect(both.map((x) => x.status).sort()).toEqual([201, 400]);
        await http().get('/catalog').set(auth(owner)).expect(200);
        await http().get(`/public/${r.slug}/menu`).expect(200);
        const running = await subOf(r.id);
        expect(running).toMatchObject({
            status: 'active',
            contract: { state: 'active', endsOn: day(60) },
            trial: { state: 'running', days: 7, billingStartsOn: day(7) }
        });
        expect(running.dueDate.slice(0, 10)).toBe(day(7));

        // converting during the trial ends it: billing starts with the definitive contract
        await contract(r.id, {
            kind: 'definitive',
            origin: 'conversion',
            startsOn: day(3),
            endsOn: day(367),
            documentId: await upload(r.id)
        }).expect(201);
        const converted = await subOf(r.id);
        expect(converted.trial).toMatchObject({
            state: 'running',
            billingStartsOn: day(3)
        });
        expect(converted.dueDate.slice(0, 10)).toBe(day(3));

        // a conversion registered by mistake is voided: the pilot and its trial come back, the history keeps it
        const [conversion] = (
            await http()
                .get(`/admin/restaurants/${r.id}/contracts`)
                .set(auth(sa))
                .expect(200)
        ).body as { id: string }[];
        const pilotId = (
            (await http().get(`/admin/restaurants/${r.id}/contracts`).set(auth(sa)))
                .body as { id: string; origin: string }[]
        ).find((c) => c.origin === 'initial')!.id;
        await http()
            .post(`/admin/restaurants/${r.id}/contracts/${pilotId}/void`)
            .set(auth(sa))
            .send({ reason: 'Errado' })
            .expect(409);
        await http()
            .post(`/admin/restaurants/${r.id}/contracts/${conversion.id}/void`)
            .set(auth(sa))
            .send({ reason: 'Datas erradas' })
            .expect(201);
        const history = (
            await http()
                .get(`/admin/restaurants/${r.id}/contracts`)
                .set(auth(sa))
                .expect(200)
        ).body as {
            origin: string;
            effectiveEndsOn: string;
            voided: { reason: string } | null;
        }[];
        expect(history.map((c) => [c.origin, !!c.voided])).toEqual([
            ['conversion', true],
            ['initial', false]
        ]);
        expect(history[1].effectiveEndsOn).toBe(day(60));
        const restored = await subOf(r.id);
        expect(restored.trial).toMatchObject({
            state: 'running',
            billingStartsOn: day(7)
        });
        expect(restored.dueDate.slice(0, 10)).toBe(day(7));

        // ending the trial early is told apart from a trial that ran its course
        await http()
            .post(`/admin/restaurants/${r.id}/trial/end`)
            .set(auth(sa))
            .send({ reason: 'x' })
            .expect(400);
        await http()
            .post(`/admin/restaurants/${r.id}/trial/end`)
            .set(auth(sa))
            .send({ reason: 'Começou a usar já' })
            .expect(204);
        const early = await subOf(r.id);
        expect(early.trial).toMatchObject({
            state: 'ended_early',
            billingStartsOn: day(0)
        });
        expect(early.dueDate.slice(0, 10)).toBe(day(0));
        await http()
            .post(`/admin/restaurants/${r.id}/trial/end`)
            .set(auth(sa))
            .send({ reason: 'De novo' })
            .expect(409);

        // payments made during the trial move up with it: the trial days left are not kept for free
        const monthAfter = (d: string) => {
            const [y, m, dd] = d.split('-').map(Number);
            return new Date(
                Date.UTC(y, m, Math.min(dd, new Date(Date.UTC(y, m + 1, 0)).getUTCDate()))
            )
                .toISOString()
                .slice(0, 10);
        };
        const ledger = async (rid: string) =>
            (
                await http()
                    .get(`/admin/restaurants/${rid}/payments`)
                    .set(auth(sa))
                    .expect(200)
            ).body as {
                kind: string;
                periodStart: string | null;
                newDueDate: string;
                voidedAt: string | null;
            }[];
        const prepaid = await create('Adiantado', 'ad');
        await contract(prepaid.id, {
            kind: 'pilot',
            origin: 'initial',
            startsOn: day(0),
            endsOn: day(200),
            trialDays: 14,
            documentId: await upload(prepaid.id)
        }).expect(201);
        await http()
            .post(`/admin/restaurants/${prepaid.id}/payments`)
            .set(auth(sa))
            .send({ cycles: 1, paidAt: day(0), noReceiptReason: 'Pago em dinheiro' })
            .expect(201);
        await http()
            .post(`/admin/restaurants/${prepaid.id}/payments`)
            .set(auth(sa))
            .send({ cycles: 1, paidAt: day(0), noReceiptReason: 'Pago em dinheiro' })
            .expect(201);
        expect((await subOf(prepaid.id)).dueDate.slice(0, 10)).toBe(
            monthAfter(monthAfter(day(14)))
        );
        await http()
            .post(`/admin/restaurants/${prepaid.id}/trial/end`)
            .set(auth(sa))
            .send({ reason: 'Começou a usar já' })
            .expect(204);
        expect((await subOf(prepaid.id)).dueDate.slice(0, 10)).toBe(
            monthAfter(monthAfter(day(0)))
        );
        const moved = (await ledger(prepaid.id))
            .filter((e) => e.kind === 'payment')
            .reverse();
        expect(moved.map((e) => e.periodStart?.slice(0, 10))).toEqual([
            day(0),
            monthAfter(day(0))
        ]);

        // a manual adjustment keeps its date, and what came after it is not moved
        const adjusted = await create('Ajustado', 'aj');
        await contract(adjusted.id, {
            kind: 'pilot',
            origin: 'initial',
            startsOn: day(0),
            endsOn: day(300),
            trialDays: 14,
            documentId: await upload(adjusted.id)
        }).expect(201);
        await http()
            .post(`/admin/restaurants/${adjusted.id}/payments`)
            .set(auth(sa))
            .send({ cycles: 1, paidAt: day(0), noReceiptReason: 'Pago em dinheiro' })
            .expect(201);
        await http()
            .post(`/admin/restaurants/${adjusted.id}/due-date`)
            .set(auth(sa))
            .send({ dueDate: day(100), reason: 'Cortesia combinada' })
            .expect(201);
        await http()
            .post(`/admin/restaurants/${adjusted.id}/payments`)
            .set(auth(sa))
            .send({ cycles: 1, paidAt: day(0), noReceiptReason: 'Pago em dinheiro' })
            .expect(201);
        const before = (await ledger(adjusted.id))
            .filter((e) => e.kind === 'payment')
            .reverse();
        await http()
            .post(`/admin/restaurants/${adjusted.id}/trial/end`)
            .set(auth(sa))
            .send({ reason: 'Começou a usar já' })
            .expect(204);
        const after = (await ledger(adjusted.id))
            .filter((e) => e.kind === 'payment')
            .reverse();
        expect(after[0].periodStart?.slice(0, 10)).toBe(day(0));
        expect(after[1]).toMatchObject({
            periodStart: before[1].periodStart,
            newDueDate: before[1].newDueDate
        });
        expect((await subOf(adjusted.id)).dueDate.slice(0, 10)).toBe(
            before[1].newDueDate.slice(0, 10)
        );

        // a renewal after a gap: the restaurant is "ended" in between, and the renewal takes over on its own start day
        const gap = await create('Intervalo', 'gp');
        await contract(gap.id, {
            kind: 'definitive',
            origin: 'initial',
            signedOn: day(-100),
            startsOn: day(-90),
            endsOn: day(-10),
            documentId: await upload(gap.id)
        }).expect(201);
        await contract(gap.id, {
            kind: 'definitive',
            origin: 'renewal',
            startsOn: day(5),
            endsOn: day(370),
            documentId: await upload(gap.id)
        }).expect(201);
        expect(await subOf(gap.id)).toMatchObject({
            status: 'ended',
            reasons: ['contract_ended'],
            contract: { state: 'ended', endsOn: day(-10), nextStartsOn: day(5) }
        });
        expect(await inList('ended', `Intervalo ${suf}`)).toEqual([gap.id]);
        await db.query(
            `UPDATE contracts SET starts_on = starts_on - 10, ends_on = ends_on - 10, effective_ends_on = effective_ends_on - 10 WHERE restaurant_id = $1 AND origin = 'renewal'`,
            [gap.id]
        );
        expect((await subOf(gap.id)).contract).toMatchObject({
            state: 'active',
            endsOn: day(360)
        });
        // billing started back at the first contract and nothing was paid: overdue, but no longer "ended"
        expect(await inList('ended', `Intervalo ${suf}`)).toEqual([]);
        expect(await inList('suspended', `Intervalo ${suf}`)).toEqual([gap.id]);

        // billing stops between contracts: days paid past the end carry over to the renewal
        const credit = await create('Credito', 'cr');
        await contract(credit.id, {
            kind: 'definitive',
            origin: 'initial',
            startsOn: day(0),
            endsOn: day(20),
            documentId: await upload(credit.id)
        }).expect(201);
        await contract(credit.id, {
            kind: 'definitive',
            origin: 'renewal',
            startsOn: day(30),
            endsOn: day(395),
            documentId: await upload(credit.id)
        }).expect(201);
        const paid = (
            await http()
                .post(`/admin/restaurants/${credit.id}/payments`)
                .set(auth(sa))
                .send({ cycles: 1, paidAt: day(0), noReceiptReason: 'Pago em dinheiro' })
                .expect(201)
        ).body;
        const shifted = new Date(Date.parse(paid.newDueDate) + 9 * 86_400_000)
            .toISOString()
            .slice(0, 10);
        expect((await subOf(credit.id)).dueDate.slice(0, 10)).toBe(shifted);

        // after the last contract ended, a payment only settles the days it covered
        const owing = await create('Devendo', 'dv');
        await contract(owing.id, {
            kind: 'definitive',
            origin: 'initial',
            signedOn: day(-100),
            startsOn: day(-90),
            endsOn: day(-10),
            documentId: await upload(owing.id)
        }).expect(201);
        const settled = (
            await http()
                .post(`/admin/restaurants/${owing.id}/payments`)
                .set(auth(sa))
                .send({ cycles: 3, paidAt: day(0), noReceiptReason: 'Quitou a dívida' })
                .expect(201)
        ).body;
        // it pays the covered days from the old due date on, not a month from today
        expect(settled.periodStart.slice(0, 10)).toBe(day(-90));
        expect(
            (
                await http()
                    .post(`/admin/restaurants/${owing.id}/payments`)
                    .set(auth(sa))
                    .send({ cycles: 1, paidAt: day(0), noReceiptReason: 'De novo' })
                    .expect(409)
            ).body.code
        ).toBe(ApiErrorCode.NOTHING_OWED);

        // a contract that ended locks the team, takes the menu down and stops orders from a table already open
        const ended = await create('Encerrado', 'en');
        await contract(ended.id, {
            kind: 'definitive',
            origin: 'initial',
            signedOn: day(-400),
            startsOn: day(-365),
            endsOn: day(30),
            documentId: await upload(ended.id)
        }).expect(201);
        expect(
            (await http().get('/admin/overview').set(auth(sa)).expect(200)).body
                .contractsEnding
        ).toBeGreaterThanOrEqual(1);
        const endedOwner = await login(`en${suf}`, ended.slug);
        await db.query(
            `UPDATE restaurants SET due_date = now() + interval '20 days' WHERE id = $1`,
            [ended.id]
        );
        const table = (
            await http()
                .post('/tables')
                .set(auth(endedOwner))
                .send({ name: 'Mesa 01' })
                .expect(201)
        ).body;
        const guest = await http()
            .post(`/public/${ended.slug}/${table.token}/session`)
            .expect(201);
        await db.query(
            `UPDATE contracts SET ends_on = $2, effective_ends_on = $2 WHERE restaurant_id = $1`,
            [ended.id, day(-1)]
        );
        const [endedLock] = (
            await http().get('/catalog').set(auth(endedOwner)).expect(403)
        ).body.details;
        expect(endedLock.contractEndsOn).toBe(day(-1));
        expect(endedLock.reasons).toEqual(['contract_ended']);
        await http().get(`/public/${ended.slug}/menu`).expect(404);
        expect(
            (
                await http()
                    .post('/public/session/open')
                    .set('Cookie', cookieOf(guest))
                    .expect(404)
            ).body.code
        ).toBe(ApiErrorCode.MENU_UNAVAILABLE);
        await http().get('/public/session').set('Cookie', cookieOf(guest)).expect(200);
    });
});
