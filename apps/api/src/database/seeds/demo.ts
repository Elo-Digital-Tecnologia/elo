import 'reflect-metadata';

import type { ContractKind } from '@elo/core/contracts/contracts';
import type { ObjectLiteral, Repository } from 'typeorm';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import type { EnvConfig } from '#/config/env.js';
import type { OrderItem } from '#/modules/orders/types/order-item.type.js';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoryKind } from '@elo/core/catalog/category-kinds';
import { FlavorPricing } from '@elo/core/catalog/option-kinds';
import { businessDay } from '@elo/core/contracts/contracts';
import { OrderStatus } from '@elo/core/orders/order-status';
import { Role } from '@elo/core/roles/roles';
import { TableState } from '@elo/core/tables/table-state';
import { AppModule } from '#/app.module.js';
import { BillingService } from '#/modules/billing/billing.service.js';
import { WaiterCallEntity } from '#/modules/calls/entities/waiter-call.entity.js';
import { CatalogService } from '#/modules/catalog/catalog.service.js';
import { ContractService } from '#/modules/contracts/contract.service.js';
import { DocumentService } from '#/modules/documents/document.service.js';
import { OrderEntity } from '#/modules/orders/entities/order.entity.js';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { RestaurantService } from '#/modules/restaurants/restaurant.service.js';
import { StaffService } from '#/modules/staff/staff.service.js';
import { DiningTableEntity } from '#/modules/tables/entities/dining-table.entity.js';
import { TableSessionEntity } from '#/modules/tables/entities/table-session.entity.js';
import { newToken } from '#/modules/tables/table.service.js';
import { randomUUID } from 'node:crypto';

/**
 * Demo data for local development: two restaurants with menu, tables, a full team
 * and a month of closed tables, so every screen and report has something to show.
 *
 * `pnpm --filter @elo/api db:seed` (after a build). Refuses to run in production
 * or on a database that already has restaurants, unless `--force` is passed.
 */

const DAY = 86_400_000;
const PASSWORD = 'demo12345';

interface DemoRestaurant {
    name: string;
    slug: string;
    managerName: string;
    managerContact: string;
    /** Days from today to the first billed day: the end of a pilot's trial, or the start of a definitive contract. */
    trialEndsIn: number;
    /** Days ago a one-cycle payment was received, if any. */
    paidDaysAgo?: number;
    contract: ContractKind;
    prefix: string;
    menu: {
        category: string;
        products: { name: string; priceCents: number; description?: string }[];
    }[];
    /** Adds a pizza category with half-and-half. */
    pizzas?: boolean;
}

/** Flavors of the demo pizza category: name and price at the medium and large sizes. */
const PIZZA_FLAVORS: [string, number, number][] = [
    ['Margherita', 5490, 6990],
    ['Calabresa', 5290, 6790],
    ['Quatro queijos', 5990, 7490],
    ['Camarão', 7490, 8990]
];

const RESTAURANTS: DemoRestaurant[] = [
    {
        name: 'Cantina Bella Massa',
        slug: 'bella-massa',
        managerName: 'Renata Alves',
        managerContact: '(11) 98765-4321',
        trialEndsIn: -10,
        paidDaysAgo: 10,
        contract: 'pilot',
        prefix: 'bm',
        pizzas: true,
        menu: [
            {
                category: 'Entradas',
                products: [
                    {
                        name: 'Bruschetta',
                        priceCents: 2890,
                        description: 'Pão italiano, tomate e manjericão'
                    },
                    { name: 'Burrata', priceCents: 4690 }
                ]
            },
            {
                category: 'Massas',
                products: [
                    { name: 'Spaghetti à carbonara', priceCents: 5890 },
                    { name: 'Lasanha à bolonhesa', priceCents: 6290 },
                    { name: 'Nhoque ao sugo', priceCents: 4990 }
                ]
            },
            {
                category: 'Bebidas',
                products: [
                    { name: 'Água com gás', priceCents: 690 },
                    { name: 'Refrigerante lata', priceCents: 790 },
                    { name: 'Taça de vinho tinto', priceCents: 2490 }
                ]
            },
            {
                category: 'Sobremesas',
                products: [
                    { name: 'Tiramisù', priceCents: 2690 },
                    { name: 'Panna cotta', priceCents: 2290 }
                ]
            }
        ]
    },
    {
        name: 'Brasa Burger',
        slug: 'brasa-burger',
        managerName: 'Diego Martins',
        managerContact: 'contato@brasaburger.com.br',
        trialEndsIn: -3,
        contract: 'definitive',
        prefix: 'bb',
        menu: [
            {
                category: 'Hambúrgueres',
                products: [
                    {
                        name: 'Clássico',
                        priceCents: 3290,
                        description: 'Blend 160 g, queijo e salada'
                    },
                    { name: 'Bacon duplo', priceCents: 4290 },
                    { name: 'Veggie', priceCents: 3490 }
                ]
            },
            {
                category: 'Porções',
                products: [
                    { name: 'Batata rústica', priceCents: 2190 },
                    { name: 'Onion rings', priceCents: 2390 }
                ]
            },
            {
                category: 'Bebidas',
                products: [
                    { name: 'Milkshake', priceCents: 2190 },
                    { name: 'Refrigerante lata', priceCents: 790 },
                    { name: 'Suco natural', priceCents: 1290 }
                ]
            }
        ]
    }
];

const PLANS = [
    { name: 'Essencial', priceCents: 9900, cycleMonths: 1 },
    { name: 'Essencial semestral', priceCents: 53_400, cycleMonths: 6 }
];

/** A one-page PDF standing in for the signed contract of a demo restaurant. */
function samplePdf(name: string): Buffer {
    const text = `Contrato de demonstracao - ${name.normalize('NFD').replace(/[^\x20-\x7e]/g, '')}`;
    const stream = `BT /F1 14 Tf 72 720 Td (${text}) Tj ET`;
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    ];
    let body = '%PDF-1.4\n';
    const offsets: number[] = [];
    objects.forEach((o, i) => {
        offsets.push(body.length);
        body += `${i + 1} 0 obj\n${o}\nendobj\n`;
    });
    const xref = body.length;
    body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(body, 'latin1');
}

const SEED_ACTOR: JwtUser = {
    sub: 'superadmin',
    roles: [Role.SUPERADMIN],
    name: 'Dados de demonstração',
    restaurantId: null,
    permissions: []
};

const TEAM: { suffix: string; name: string; displayName: string; roles: Role[] }[] = [
    {
        suffix: 'gerente',
        name: 'Gabriela Torres',
        displayName: 'Gabi',
        roles: [Role.MANAGER]
    },
    { suffix: 'garcom', name: 'Ana Souza', displayName: 'Ana', roles: [Role.WAITER] },
    {
        suffix: 'garcom2',
        name: 'Bruno Lima',
        displayName: 'Bruno',
        roles: [Role.WAITER, Role.CASHIER]
    },
    {
        suffix: 'cozinha',
        name: 'Carla Rocha',
        displayName: 'Carla',
        roles: [Role.KITCHEN]
    },
    { suffix: 'caixa', name: 'Davi Nunes', displayName: 'Davi', roles: [Role.CASHIER] }
];

async function main() {
    const force = process.argv.includes('--force');
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn']
    });
    try {
        const configService = app.get<ConfigService<EnvConfig, true>>(ConfigService);
        if (configService.getOrThrow('app.isProduction', { infer: true }))
            throw new Error('The demo seed never runs in production');
        const repo = <T extends ObjectLiteral>(entity: new () => T) =>
            app.get<Repository<T>>(getRepositoryToken(entity));
        const restaurantsRepo = repo(RestaurantEntity);
        if (!force && (await restaurantsRepo.count({ withDeleted: true }))) {
            throw new Error(
                'The database already has restaurants; pass --force to seed anyway'
            );
        }
        const restaurants = app.get(RestaurantService);
        const staff = app.get(StaffService);
        const catalog = app.get(CatalogService);
        const billing = app.get(BillingService);
        const documents = app.get(DocumentService);
        const contracts = app.get(ContractService);
        const credentials: string[] = [];
        const [plan] = await Promise.all(PLANS.map((p) => billing.createPlan(p)));
        if (!plan) throw new Error('The demo needs at least one plan');

        for (const demo of RESTAURANTS) {
            const r = await restaurants.create({
                name: demo.name,
                slug: demo.slug,
                managerName: demo.managerName,
                managerContact: demo.managerContact,
                planId: plan.id,
                adminUsername: `${demo.prefix}admin`,
                adminPassword: PASSWORD
            });
            // A signed contract (a sample PDF) so the menu and the team are on. A pilot has run
            // since the restaurant joined, with a trial up to its first billed day.
            const pilot = demo.contract === 'pilot';
            const startsOn = businessDay(
                new Date(Date.now() + (pilot ? -45 : demo.trialEndsIn) * DAY)
            );
            const file = await documents.upload(
                r.id,
                'contract',
                {
                    buffer: samplePdf(demo.name),
                    originalname: `contrato-${demo.slug}.pdf`
                },
                SEED_ACTOR
            );
            await contracts.register(
                r.id,
                {
                    kind: demo.contract,
                    origin: 'initial',
                    signedOn: startsOn,
                    startsOn,
                    endsOn: businessDay(new Date(Date.now() + (pilot ? 45 : 320) * DAY)),
                    signatory: {
                        name: demo.managerName,
                        role: 'Sócio-proprietário',
                        contact: demo.managerContact
                    },
                    documentId: file.id,
                    trialDays: pilot ? 45 + demo.trialEndsIn : 0
                },
                SEED_ACTOR
            );
            // The demo restaurants have been customers for a while; their history goes back further than today.
            await restaurantsRepo.update(
                { id: r.id },
                { createdAt: new Date(Date.now() - 45 * DAY) }
            );
            if (demo.paidDaysAgo !== undefined) {
                await billing.record(
                    r.id,
                    {
                        cycles: 1,
                        paidAt: businessDay(
                            new Date(Date.now() - demo.paidDaysAgo * DAY)
                        ),
                        noReceiptReason: 'Dados de demonstração'
                    },
                    SEED_ACTOR
                );
            }
            credentials.push(
                `/r/${r.slug}/login  ${demo.prefix}admin (${Role.RESTAURANT_ADMIN})`
            );

            const waiters: string[] = [];
            for (const member of TEAM) {
                const created = await staff.create({
                    restaurantId: r.id,
                    username: demo.prefix + member.suffix,
                    password: PASSWORD,
                    name: member.name,
                    displayName: member.displayName,
                    roles: member.roles
                });
                if (member.roles.includes(Role.WAITER)) waiters.push(created.id);
                credentials.push(
                    `/r/${r.slug}/login  ${demo.prefix}${member.suffix} (${member.roles.join(' + ')})`
                );
            }

            const products: { id: string; name: string; priceCents: number }[] = [];
            for (const section of demo.menu) {
                const category = await catalog.createCategory(r.id, {
                    name: section.category
                });
                for (const p of section.products)
                    products.push(
                        await catalog.createProduct(r.id, {
                            categoryId: category.id,
                            ...p
                        })
                    );
            }

            if (demo.pizzas) {
                const medium = randomUUID();
                const large = randomUUID();
                const pizzas = await catalog.createCategory(r.id, {
                    name: 'Pizzas',
                    kind: CategoryKind.PIZZA,
                    pizza: {
                        sizesName: 'Tamanho',
                        flavorsName: 'Sabores',
                        flavorPricing: FlavorPricing.AVERAGE,
                        sizes: [
                            { id: medium, label: 'Média', maxFlavors: 2 },
                            { id: large, label: 'Grande', maxFlavors: 3 }
                        ],
                        addons: [
                            {
                                name: 'Borda',
                                required: false,
                                multiple: false,
                                choices: [
                                    {
                                        label: 'Catupiry',
                                        sizePrices: { [medium]: 800, [large]: 1000 }
                                    }
                                ]
                            }
                        ]
                    }
                });
                for (const [name, m, g] of PIZZA_FLAVORS)
                    await catalog.createProduct(r.id, {
                        categoryId: pizzas.id,
                        name,
                        sizePrices: { [medium]: m, [large]: g }
                    });
            }

            const tables = await repo(DiningTableEntity).save(
                Array.from({ length: 6 }, (_, i) =>
                    repo(DiningTableEntity).create({
                        restaurantId: r.id,
                        name: `Mesa ${String(i + 1).padStart(2, '0')}`,
                        token: newToken(),
                        state: TableState.CLOSED,
                        waiterId: null
                    })
                )
            );
            await history(app, r.id, tables, products, waiters);
        }

        console.log(`\nDemo data ready. Password for every account: ${PASSWORD}\n`);
        for (const line of credentials) console.log(`  ${line}`);
    } finally {
        await app.close();
    }
}

/** A month of closed tables: sessions opened and closed by the waiters, served orders and answered calls. */
async function history(
    app: Awaited<ReturnType<typeof NestFactory.createApplicationContext>>,
    restaurantId: string,
    tables: DiningTableEntity[],
    products: { id: string; name: string; priceCents: number }[],
    waiters: string[]
) {
    const sessions = app.get<Repository<TableSessionEntity>>(
        getRepositoryToken(TableSessionEntity)
    );
    const orders = app.get<Repository<OrderEntity>>(getRepositoryToken(OrderEntity));
    const calls = app.get<Repository<WaiterCallEntity>>(
        getRepositoryToken(WaiterCallEntity)
    );
    const pick = <T>(list: T[]): T => {
        const item = list[Math.floor(Math.random() * list.length)];
        if (item === undefined) throw new Error('Nothing to pick from');
        return item;
    };

    for (let day = 30; day >= 1; day--) {
        for (let visit = 0; visit < 2 + Math.floor(Math.random() * 4); visit++) {
            const table = pick(tables);
            const waiter = pick(waiters);
            const start = new Date(
                Date.now() - day * DAY + (12 + Math.random() * 9) * 3_600_000
            );
            const at = (minutes: number) => new Date(start.getTime() + minutes * 60_000);
            const session = await sessions.save(
                sessions.create({
                    restaurantId,
                    tableId: table.id,
                    expiresAt: at(240),
                    createdAt: start,
                    openRequestedAt: start,
                    openedAt: at(1 + Math.random() * 3),
                    openedBy: waiter,
                    closeRequestedAt: at(70),
                    closedAt: at(75),
                    closedBy: waiter,
                    closedReason: 'closed'
                })
            );
            for (let round = 0; round < 1 + Math.floor(Math.random() * 3); round++) {
                const items: OrderItem[] = Array.from(
                    { length: 1 + Math.floor(Math.random() * 3) },
                    () => {
                        const p = pick(products);
                        return {
                            productId: p.id,
                            name: p.name,
                            unitCents: p.priceCents,
                            quantity: 1 + Math.floor(Math.random() * 2),
                            options: []
                        };
                    }
                );
                await orders.save(
                    orders.create({
                        restaurantId,
                        tableId: table.id,
                        sessionId: session.id,
                        status: OrderStatus.READY,
                        items,
                        createdAt: at(5 + round * 20)
                    })
                );
            }
            if (Math.random() < 0.5) {
                await calls.save(
                    calls.create({
                        restaurantId,
                        tableId: table.id,
                        createdAt: at(30),
                        resolvedAt: at(31 + Math.random() * 3),
                        resolvedBy: waiter
                    })
                );
            }
        }
    }
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
});
