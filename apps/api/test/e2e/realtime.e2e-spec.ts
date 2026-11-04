import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { io } from 'socket.io-client';
import { beforeAll, describe, expect, it } from 'vitest';
import { useFlow } from '../support/flow.js';

describe('realtime (e2e)', () => {
    const flow = useFlow();
    const { http, cookieOf, waitFor } = flow;
    let app: INestApplication,
        url: string,
        slug: string,
        waiter: string,
        tableId: string,
        tableToken: string;
    beforeAll(() => ({ app, url, slug, waiter, tableId, tableToken } = flow.fixture()));

    it('realtime: refused sockets are told why, and a reconnected socket gets events again', async () => {
        const expired = app
            .get(JwtService)
            .sign(
                { sub: 'x', role: 'waiter', restaurantId: null, permissions: [] },
                { expiresIn: -10 }
            );
        for (const [opts, reason] of [
            [{ auth: { token: expired } }, 'expired'],
            [{ auth: { token: 'garbage' } }, 'invalid'],
            [{}, 'session']
        ] as const) {
            const s = io(url, {
                ...opts,
                transports: ['websocket'],
                reconnection: false
            });
            expect(await waitFor(s, 'auth_error')).toBe(reason);
            s.close();
        }

        const staff = io(url, { auth: { token: waiter }, transports: ['websocket'] });
        await waitFor(staff, 'connect');
        staff.disconnect();
        staff.connect();
        await waitFor(staff, 'connect');
        await new Promise((r) => setTimeout(r, 200));
        const updated = waitFor(staff, 'table.updated');
        await http()
            .post(`/public/${slug}/${tableToken}/session`)
            .then((s) =>
                http().post('/public/session/open').set('Cookie', cookieOf(s)).expect(201)
            );
        expect(((await updated) as { state: string }).state).toBe('pending_open');
        await http()
            .post(`/tables/${tableId}/reject-open`)
            .set('Authorization', `Bearer ${waiter}`)
            .expect(201);
        staff.close();
    });

    it('realtime: a guest joins with the session ticket alone, and tickets and staff tokens never pass for each other', async () => {
        const started = await http()
            .post(`/public/${slug}/${tableToken}/session`)
            .expect(201);
        const ticket = started.body.realtimeTicket as string;
        expect(typeof ticket).toBe('string');
        await http()
            .post('/public/session/open')
            .set('Cookie', cookieOf(started))
            .expect(201);

        // no cookie: another host than the API's, or a browser that keeps it from the socket
        const guest = io(url, { auth: { ticket }, transports: ['websocket'] });
        await waitFor(guest, 'ready');
        expect(await guest.timeout(2000).emitWithAck('alive')).toBe(true);
        const opened = waitFor(guest, 'table.updated');
        await http()
            .post(`/tables/${tableId}/validate-open`)
            .set('Authorization', `Bearer ${waiter}`)
            .expect(201);
        expect(((await opened) as { state: string }).state).toBe('open');

        for (const [opts, reason] of [
            [{ auth: { ticket: waiter } }, 'session'],
            [{ auth: { token: ticket } }, 'invalid']
        ] as const) {
            const s = io(url, {
                ...opts,
                transports: ['websocket'],
                reconnection: false
            });
            expect(await waitFor(s, 'auth_error')).toBe(reason);
            s.close();
        }
        await http()
            .get('/restaurant/me')
            .set('Authorization', `Bearer ${ticket}`)
            .expect(401);

        await http()
            .post(`/tables/${tableId}/close`)
            .set('Authorization', `Bearer ${waiter}`)
            .expect(201);
        guest.close();
        const late = io(url, {
            auth: { ticket },
            transports: ['websocket'],
            reconnection: false
        });
        expect(await waitFor(late, 'auth_error')).toBe('session');
        late.close();
    });
});
