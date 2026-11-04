import { describe, expect, it } from 'vitest';
import {
    availability,
    hoursProblems,
    openStatus,
    pauseProblems,
    weekShifts
} from './open-status.js';

describe('openStatus', () => {
    const TZ = 'America/Sao_Paulo'; // UTC-3, sem horário de verão
    const day = [{ open: '11:00', close: '23:00' }];
    const week = [[], day, day, day, day, day, [{ open: '11:00', close: '02:00' }]]; // dom fechado; sáb vai até 02:00
    const at = (isoUtc: string) => openStatus(week, new Date(isoUtc), TZ);

    it('sem horário cadastrado não mostra nada', () => {
        expect(openStatus(null, new Date(), TZ)).toBeNull();
        expect(openStatus([], new Date(), TZ)).toBeNull();
    });
    it('aberto dentro do horário, no fuso do restaurante', () => {
        // Monday 14:00 in Brasília = 17:00 UTC
        expect(at('2026-11-02T17:00:00Z')).toEqual({
            open: true,
            change: expect.objectContaining({ time: '23:00' })
        });
    });
    it('antes de abrir diz que abre hoje', () => {
        expect(at('2026-11-02T12:00:00Z')).toEqual({
            open: false,
            change: expect.objectContaining({ time: '11:00', daysAhead: 0 })
        }); // 09:00 em Brasília
    });
    it('depois de fechar aponta o próximo dia', () => {
        expect(at('2026-11-03T02:30:00Z')).toEqual({
            open: false,
            change: expect.objectContaining({ time: '11:00', daysAhead: 1 })
        }); // seg 23:30 em Brasília
    });
    it('domingo fechado leva para segunda', () => {
        expect(at('2026-11-01T15:00:00Z')).toEqual({
            open: false,
            change: expect.objectContaining({ time: '11:00', daysAhead: 1 })
        });
    });
    it('turno que passa da meia-noite continua aberto no dia seguinte', () => {
        // Saturday 23:30 open; Sunday 01:00 still in Saturday's shift; Sunday 03:00 closed
        expect(at('2026-11-08T02:30:00Z')).toEqual({
            open: true,
            change: expect.objectContaining({ time: '02:00' })
        }); // sáb 23:30
        expect(at('2026-11-08T04:00:00Z')).toEqual({
            open: true,
            change: expect.objectContaining({ time: '02:00' })
        }); // dom 01:00
        expect(at('2026-11-08T06:00:00Z')).toMatchObject({ open: false }); // dom 03:00
    });
    it('semana toda fechada', () => {
        expect(openStatus([[], [], [], [], [], [], []], new Date(), TZ)).toEqual({
            open: false,
            change: null
        });
    });
});

describe('weekShifts', () => {
    it('splits a shift that closes after midnight into its day and the early hours of the next', () => {
        const week = weekShifts([
            [{ open: '21:00', close: '01:00' }],
            [],
            [],
            [],
            [],
            [],
            [{ open: '11:00', close: '23:00' }]
        ]);
        expect(week[0]).toEqual([
            { from: 1260, to: 1440, spill: false, day: 0, index: 0 }
        ]);
        // Monday is off, but the early hours still belong to Sunday's shift
        expect(week[1]).toEqual([{ from: 0, to: 60, spill: true, day: 0, index: 0 }]);
        expect(week[6]).toEqual([
            { from: 660, to: 1380, spill: false, day: 6, index: 0 }
        ]);
        expect(
            weekShifts([[], [], [], [], [], [], [{ open: '18:00', close: '00:00' }]])[0]
        ).toEqual([]);
    });
    it('gives each shift of a day its own stretch', () => {
        const week = weekShifts([
            [
                { open: '11:00', close: '15:00' },
                { open: '18:00', close: '23:00' }
            ],
            [],
            [],
            [],
            [],
            [],
            []
        ]);
        expect(week[0].map((p) => [p.from, p.to, p.index])).toEqual([
            [660, 900, 0],
            [1080, 1380, 1]
        ]);
    });
});

describe('several shifts in a day', () => {
    const TZ = 'America/Sao_Paulo';
    const split = [
        { open: '11:00', close: '15:00' },
        { open: '18:00', close: '23:00' }
    ];
    const week = [
        [],
        split,
        split,
        split,
        split,
        split,
        [
            { open: '11:00', close: '15:00' },
            { open: '19:00', close: '02:00' }
        ]
    ];
    const at = (isoUtc: string) => openStatus(week, new Date(isoUtc), TZ);

    it('is open in each shift and closed in the break, pointing at the next shift of the day', () => {
        expect(at('2026-11-02T14:00:00Z')).toEqual({
            open: true,
            change: expect.objectContaining({ time: '15:00' })
        }); // seg 11:00... 14:00Z = 11:00
        expect(at('2026-11-02T18:30:00Z')).toEqual({
            open: false,
            change: expect.objectContaining({ time: '18:00', daysAhead: 0 })
        }); // seg 15:30
        expect(at('2026-11-02T22:00:00Z')).toEqual({
            open: true,
            change: expect.objectContaining({ time: '23:00' })
        }); // seg 19:00
        expect(at('2026-11-03T02:30:00Z')).toEqual({
            open: false,
            change: expect.objectContaining({ time: '11:00', daysAhead: 1 })
        }); // seg 23:30
    });
    it('the last shift of a day can run past midnight', () => {
        expect(at('2026-11-08T04:00:00Z')).toEqual({
            open: true,
            change: expect.objectContaining({ time: '02:00' })
        }); // dom 01:00, turno de sábado
        expect(at('2026-11-07T19:00:00Z')).toEqual({
            open: false,
            change: expect.objectContaining({ time: '19:00', daysAhead: 0 })
        }); // sáb 16:00
    });
    it('availability reports the break as outside the hours and when it ends', () => {
        expect(
            availability({
                hours: week,
                pauses: [],
                now: new Date('2026-11-02T18:30:00Z'),
                timeZone: TZ
            })
        ).toMatchObject({
            open: false,
            reason: 'hours',
            changesAt: '2026-11-02T21:00:00.000Z'
        });
    });
});

describe('hoursProblems', () => {
    const ok = { open: '11:00', close: '15:00' };
    const week = (monday: unknown[], tuesday: unknown[] = []) => [
        [],
        monday,
        tuesday,
        [],
        [],
        [],
        []
    ];
    it('accepts a normal week, a break and a last shift past midnight', () => {
        expect(hoursProblems(week([ok, { open: '18:00', close: '23:00' }]))).toEqual([]);
        expect(
            hoursProblems(
                week(
                    [ok, { open: '18:00', close: '01:00' }],
                    [{ open: '11:00', close: '15:00' }]
                )
            )
        ).toEqual([]);
        expect(hoursProblems(week([{ open: '00:00', close: '00:00' }]))).toEqual([]);
    });
    it('refuses what is not a week of shifts', () => {
        expect(hoursProblems(null)).toEqual([
            { day: null, shift: null, code: 'not_a_week' }
        ]);
        expect(hoursProblems([null, [], [], [], [], [], []])).toEqual([
            { day: null, shift: null, code: 'not_a_week' }
        ]);
        expect(hoursProblems(week([{ open: '25:00', close: '23:00' }]))).toEqual([
            { day: 1, shift: 0, code: 'invalid_time' }
        ]);
        expect(hoursProblems(week(Array(11).fill(ok)))).toEqual([
            { day: 1, shift: null, code: 'too_many_shifts' }
        ]);
    });
    it('shifts must come in order, with a gap, and only the last may pass midnight', () => {
        expect(hoursProblems(week([{ open: '18:00', close: '23:00' }, ok]))).toEqual([
            { day: 1, shift: 1, code: 'unordered' }
        ]);
        expect(hoursProblems(week([ok, { open: '14:00', close: '20:00' }]))).toEqual([
            { day: 1, shift: 1, code: 'overlap' }
        ]);
        expect(hoursProblems(week([ok, { open: '15:00', close: '20:00' }]))).toEqual([
            { day: 1, shift: 1, code: 'overlap' }
        ]);
        expect(
            hoursProblems(
                week([
                    { open: '11:00', close: '02:00' },
                    { open: '18:00', close: '23:00' }
                ])
            )
        ).toEqual([{ day: 1, shift: 0, code: 'overnight_not_last' }]);
    });
    it('the night of one day cannot reach the first shift of the next', () => {
        expect(
            hoursProblems(
                week(
                    [{ open: '21:00', close: '02:00' }],
                    [{ open: '01:00', close: '05:00' }]
                )
            )
        ).toEqual([{ day: 1, shift: 0, code: 'overlaps_next_day' }]);
        expect(
            hoursProblems(
                week(
                    [{ open: '21:00', close: '00:00' }],
                    [{ open: '00:00', close: '05:00' }]
                )
            )
        ).toEqual([]);
    });
});

describe('availability', () => {
    const TZ = 'America/Sao_Paulo';
    const week = [[], ...Array(6).fill([{ open: '18:00', close: '23:00' }])];
    const now = new Date('2026-11-10T22:30:00Z'); // terça 19:30 local
    it('is always open without hours or closures', () => {
        expect(availability({ hours: null, pauses: [], now, timeZone: TZ })).toEqual({
            open: true,
            reason: null,
            extra: false,
            hours: null,
            until: null,
            pauseReason: null,
            changesAt: null
        });
    });
    it('follows the hours and says when they change', () => {
        expect(
            availability({ hours: week, pauses: [], now, timeZone: TZ })
        ).toMatchObject({
            open: true,
            reason: null,
            changesAt: '2026-11-11T02:00:00.000Z'
        });
        const later = availability({
            hours: week,
            pauses: [],
            now: new Date('2026-11-11T03:00:00Z'),
            timeZone: TZ
        });
        expect(later).toMatchObject({
            open: false,
            reason: 'hours',
            hours: {
                open: false,
                change: expect.objectContaining({ time: '18:00', daysAhead: 0 })
            },
            changesAt: '2026-11-11T21:00:00.000Z'
        });
    });
    it('a closure wins over the hours and ends early when someone reopens', () => {
        const pause = {
            startsAt: '2026-11-10T21:00:00Z',
            endsAt: '2026-11-12T21:00:00Z',
            reason: ' Reforma '
        };
        expect(availability({ hours: week, pauses: [pause], now, timeZone: TZ })).toEqual(
            {
                open: false,
                reason: 'pause',
                extra: false,
                hours: null,
                until: { time: '18:00', day: 12, month: 11, today: false },
                pauseReason: 'Reforma',
                changesAt: '2026-11-12T21:00:00.000Z'
            }
        );
        expect(
            availability({
                hours: null,
                pauses: [{ ...pause, endsAt: null }],
                now,
                timeZone: TZ
            })
        ).toMatchObject({ until: null, changesAt: null });
        expect(
            availability({
                hours: null,
                pauses: [{ ...pause, endedAt: '2026-11-10T22:00:00Z' }],
                now,
                timeZone: TZ
            }).open
        ).toBe(true);
        expect(
            availability({
                hours: null,
                pauses: [{ ...pause, endsAt: '2026-11-11T01:00:00Z' }],
                now,
                timeZone: TZ
            }).until
        ).toEqual({ time: '22:00', day: 10, month: 11, today: true });
    });
    it('a scheduled closure is the next change', () => {
        const pause = { startsAt: '2026-11-10T23:00:00Z', endsAt: null };
        expect(
            availability({ hours: null, pauses: [pause], now, timeZone: TZ })
        ).toMatchObject({ open: true, changesAt: '2026-11-10T23:00:00.000Z' });
    });
    it('an extra opening opens outside the hours, until its end; a closure still wins', () => {
        const late = new Date('2026-11-11T03:30:00Z'); // quarta 00:30 local, depois do fechamento das 23:00
        const opening = {
            kind: 'opening' as const,
            startsAt: '2026-11-11T01:30:00Z',
            endsAt: '2026-11-11T05:00:00Z',
            reason: 'Festa'
        };
        expect(
            availability({ hours: week, pauses: [opening], now: late, timeZone: TZ })
        ).toMatchObject({
            open: true,
            reason: null,
            extra: true,
            until: { time: '02:00' },
            pauseReason: null,
            changesAt: '2026-11-11T05:00:00.000Z'
        });
        expect(
            availability({
                hours: week,
                pauses: [opening],
                now: new Date('2026-11-11T05:00:00Z'),
                timeZone: TZ
            })
        ).toMatchObject({ open: false, reason: 'hours' });
        // still inside the hours: the opening only takes over at the closing time
        expect(
            availability({
                hours: week,
                pauses: [opening],
                now: new Date('2026-11-11T01:45:00Z'),
                timeZone: TZ
            })
        ).toMatchObject({
            open: true,
            extra: false,
            changesAt: '2026-11-11T02:00:00.000Z'
        });
        const closure = { startsAt: '2026-11-11T03:00:00Z', endsAt: null };
        expect(
            availability({
                hours: week,
                pauses: [opening, closure],
                now: late,
                timeZone: TZ
            })
        ).toMatchObject({ open: false, reason: 'pause' });
    });
    it('checks a new extra opening: it needs an end, lasts a day at most, and only clashes with other openings', () => {
        const at = (iso: string) => new Date(iso);
        expect(
            pauseProblems({ kind: 'opening', startsAt: now, endsAt: null }, [], now)
        ).toEqual(['opening_needs_end']);
        expect(
            pauseProblems(
                { kind: 'opening', startsAt: now, endsAt: at('2026-11-12T00:00:00Z') },
                [],
                now
            )
        ).toEqual(['opening_too_long']);
        const closure = { startsAt: '2026-11-10T22:00:00Z', endsAt: null };
        expect(
            pauseProblems(
                { kind: 'opening', startsAt: now, endsAt: at('2026-11-11T03:00:00Z') },
                [closure],
                now
            )
        ).toEqual([]);
        expect(
            pauseProblems(
                { kind: 'opening', startsAt: now, endsAt: at('2026-11-11T03:00:00Z') },
                [
                    {
                        kind: 'opening',
                        startsAt: '2026-11-11T02:00:00Z',
                        endsAt: '2026-11-11T04:00:00Z'
                    }
                ],
                now
            )
        ).toEqual(['overlaps']);
    });
    it('checks a new closure', () => {
        const at = (iso: string) => new Date(iso);
        expect(
            pauseProblems({ startsAt: now, endsAt: at('2026-11-10T22:00:00Z') }, [], now)
        ).toEqual(['ends_before_start']);
        expect(
            pauseProblems({ startsAt: at('2026-11-09T22:00:00Z'), endsAt: null }, [], now)
        ).toEqual(['starts_in_past']);
        expect(
            pauseProblems({ startsAt: at('2028-01-01T00:00:00Z'), endsAt: null }, [], now)
        ).toEqual(['too_far_ahead']);
        const other = {
            startsAt: '2026-11-11T00:00:00Z',
            endsAt: '2026-11-11T05:00:00Z'
        };
        expect(
            pauseProblems(
                { startsAt: now, endsAt: at('2026-11-11T01:00:00Z') },
                [other],
                now
            )
        ).toEqual(['overlaps']);
        expect(
            pauseProblems(
                { startsAt: now, endsAt: at('2026-11-10T23:00:00Z') },
                [other],
                now
            )
        ).toEqual([]);
        expect(
            pauseProblems(
                { startsAt: now, endsAt: null },
                [{ ...other, endedAt: '2026-11-10T22:00:00Z' }],
                now
            )
        ).toEqual([]);
    });
});
