import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type ContractKind, OrderStatus, Role, ROLE_LABEL, TableState, toDay } from '@elo/core';
import { type ObjectLiteral, Repository } from 'typeorm';
import { AppModule } from '../../app.module';
import { BillingService } from '../../billing/billing.service';
import type { JwtUser } from '../../common/auth-types';
import { CatalogService } from '../../catalog/catalog.service';
import { ContractsService } from '../../contracts/contracts.service';
import { DocumentsService } from '../../documents/documents.service';
import { RestaurantsService } from '../../restaurants/restaurants.service';
import { StaffService } from '../../staff/staff.service';
import { newToken } from '../../tables/tables.service';
import { DiningTable, Order, type OrderItem, Restaurant, TableSession, WaiterCall } from '../entities';

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
  /** Days from today to the end of the trial. */
  trialEndsIn: number;
  /** Days ago a one-cycle payment was received, if any. */
  paidDaysAgo?: number;
  contract: ContractKind;
  prefix: string;
  menu: { category: string; products: { name: string; priceCents: number; description?: string }[] }[];
}

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
    menu: [
      { category: 'Entradas', products: [{ name: 'Bruschetta', priceCents: 2890, description: 'Pão italiano, tomate e manjericão' }, { name: 'Burrata', priceCents: 4690 }] },
      { category: 'Massas', products: [{ name: 'Spaghetti à carbonara', priceCents: 5890 }, { name: 'Lasanha à bolonhesa', priceCents: 6290 }, { name: 'Nhoque ao sugo', priceCents: 4990 }] },
      { category: 'Bebidas', products: [{ name: 'Água com gás', priceCents: 690 }, { name: 'Refrigerante lata', priceCents: 790 }, { name: 'Taça de vinho tinto', priceCents: 2490 }] },
      { category: 'Sobremesas', products: [{ name: 'Tiramisù', priceCents: 2690 }, { name: 'Panna cotta', priceCents: 2290 }] },
    ],
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
      { category: 'Hambúrgueres', products: [{ name: 'Clássico', priceCents: 3290, description: 'Blend 160 g, queijo e salada' }, { name: 'Bacon duplo', priceCents: 4290 }, { name: 'Veggie', priceCents: 3490 }] },
      { category: 'Porções', products: [{ name: 'Batata rústica', priceCents: 2190 }, { name: 'Onion rings', priceCents: 2390 }] },
      { category: 'Bebidas', products: [{ name: 'Milkshake', priceCents: 2190 }, { name: 'Refrigerante lata', priceCents: 790 }, { name: 'Suco natural', priceCents: 1290 }] },
    ],
  },
];

const PLANS = [
  { name: 'Essencial', priceCents: 9900, cycleMonths: 1 },
  { name: 'Essencial semestral', priceCents: 53_400, cycleMonths: 6 },
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
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
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

const SEED_ACTOR: JwtUser = { sub: 'superadmin', roles: [Role.Superadmin], name: 'Dados de demonstração', restaurantId: null, permissions: [] };

const TEAM: { suffix: string; name: string; displayName: string; roles: Role[] }[] = [
  { suffix: 'gerente', name: 'Gabriela Torres', displayName: 'Gabi', roles: [Role.Manager] },
  { suffix: 'garcom', name: 'Ana Souza', displayName: 'Ana', roles: [Role.Waiter] },
  { suffix: 'garcom2', name: 'Bruno Lima', displayName: 'Bruno', roles: [Role.Waiter, Role.Cashier] },
  { suffix: 'cozinha', name: 'Carla Rocha', displayName: 'Carla', roles: [Role.Kitchen] },
  { suffix: 'caixa', name: 'Davi Nunes', displayName: 'Davi', roles: [Role.Cashier] },
];

async function main() {
  const force = process.argv.includes('--force');
  if (process.env.NODE_ENV === 'production') throw new Error('The demo seed never runs in production');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const repo = <T extends ObjectLiteral>(entity: new () => T) => app.get<Repository<T>>(getRepositoryToken(entity));
    const restaurantsRepo = repo(Restaurant);
    if (!force && (await restaurantsRepo.count({ withDeleted: true }))) {
      throw new Error('The database already has restaurants; pass --force to seed anyway');
    }
    const restaurants = app.get(RestaurantsService);
    const staff = app.get(StaffService);
    const catalog = app.get(CatalogService);
    const billing = app.get(BillingService);
    const documents = app.get(DocumentsService);
    const contracts = app.get(ContractsService);
    const credentials: string[] = [];
    const [plan] = await Promise.all(PLANS.map((p) => billing.createPlan(p)));

    for (const demo of RESTAURANTS) {
      const r = await restaurants.create({
        name: demo.name,
        slug: demo.slug,
        managerName: demo.managerName,
        managerContact: demo.managerContact,
        planId: plan.id,
        trialDays: 14,
        adminUsername: `${demo.prefix}admin`,
        adminPassword: PASSWORD,
      });
      // A signed contract (a sample PDF) so the menu and the team are on.
      const startsOn = toDay(new Date(Date.now() - 45 * DAY));
      const file = await documents.upload(r.id, 'contract', { buffer: samplePdf(demo.name), originalname: `contrato-${demo.slug}.pdf` }, SEED_ACTOR);
      await contracts.register(
        r.id,
        {
          kind: demo.contract,
          origin: 'initial',
          signedOn: startsOn,
          startsOn,
          endsOn: toDay(new Date(Date.now() + (demo.contract === 'pilot' ? 45 : 320) * DAY)),
          signatory: { name: demo.managerName, role: 'Sócio-proprietário', contact: demo.managerContact },
          documentId: file.id,
        },
        SEED_ACTOR,
      );
      // The demo restaurants have been customers for a while; their history goes back further than today.
      const firstDue = new Date(Date.now() + demo.trialEndsIn * DAY);
      await restaurantsRepo.update({ id: r.id }, { createdAt: new Date(Date.now() - 45 * DAY), initialDueDate: firstDue, dueDate: firstDue });
      if (demo.paidDaysAgo !== undefined) {
        await billing.record(r.id, { cycles: 1, paidAt: toDay(new Date(Date.now() - demo.paidDaysAgo * DAY)), noReceiptReason: 'Dados de demonstração' }, SEED_ACTOR);
      }
      credentials.push(`/r/${r.slug}/login  ${demo.prefix}admin (${ROLE_LABEL[Role.RestaurantAdmin]})`);

      const waiters: string[] = [];
      for (const member of TEAM) {
        const created = await staff.create({ restaurantId: r.id, username: demo.prefix + member.suffix, password: PASSWORD, name: member.name, displayName: member.displayName, roles: member.roles });
        if (member.roles.includes(Role.Waiter)) waiters.push(created.id);
        credentials.push(`/r/${r.slug}/login  ${demo.prefix}${member.suffix} (${member.roles.map((role) => ROLE_LABEL[role]).join(' + ')})`);
      }

      const products: { id: string; name: string; priceCents: number }[] = [];
      for (const section of demo.menu) {
        const category = await catalog.createCategory(r.id, { name: section.category });
        for (const p of section.products) products.push(await catalog.createProduct(r.id, { categoryId: category.id, ...p }));
      }

      const tables = await repo(DiningTable).save(
        Array.from({ length: 6 }, (_, i) => repo(DiningTable).create({ restaurantId: r.id, name: `Mesa ${String(i + 1).padStart(2, '0')}`, token: newToken(), state: TableState.Closed, waiterId: null })),
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
  tables: DiningTable[],
  products: { id: string; name: string; priceCents: number }[],
  waiters: string[],
) {
  const sessions = app.get<Repository<TableSession>>(getRepositoryToken(TableSession));
  const orders = app.get<Repository<Order>>(getRepositoryToken(Order));
  const calls = app.get<Repository<WaiterCall>>(getRepositoryToken(WaiterCall));
  const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];

  for (let day = 30; day >= 1; day--) {
    for (let visit = 0; visit < 2 + Math.floor(Math.random() * 4); visit++) {
      const table = pick(tables);
      const waiter = pick(waiters);
      const start = new Date(Date.now() - day * DAY + (12 + Math.random() * 9) * 3_600_000);
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
          closedReason: 'closed',
        }),
      );
      for (let round = 0; round < 1 + Math.floor(Math.random() * 3); round++) {
        const items: OrderItem[] = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => {
          const p = pick(products);
          return { productId: p.id, name: p.name, unitCents: p.priceCents, quantity: 1 + Math.floor(Math.random() * 2), options: [] };
        });
        await orders.save(orders.create({ restaurantId, tableId: table.id, sessionId: session.id, status: OrderStatus.Ready, items, createdAt: at(5 + round * 20) }));
      }
      if (Math.random() < 0.5) {
        await calls.save(calls.create({ restaurantId, tableId: table.id, createdAt: at(30), resolvedAt: at(31 + Math.random() * 3), resolvedBy: waiter }));
      }
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
