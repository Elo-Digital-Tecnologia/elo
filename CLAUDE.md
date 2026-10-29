# Elo Digital

Startup project offering digital products and services. The first product is **Elo Cardápio**: a subscription-based digital menu for restaurants, pizzerias, burger joints, etc. Guests scan a QR code / NFC tag on their table, build an order, and the waiter, kitchen and cashier handle it in real time. Payments are not processed by the system.

When something is missing or unclear, ask instead of inventing.

## Monorepo

pnpm workspaces + Turborepo, TypeScript everywhere (Node >= 22).

| Path | Description |
|---|---|
| `apps/api` | NestJS 10 + TypeORM + PostgreSQL. REST, WebSockets (Socket.IO), Swagger, throttling |
| `apps/web` | Next.js 14 (App Router) + Tailwind. Public menu, restaurant dashboard (waiter, kitchen, cashier, admin) and Elo Digital admin (`/admin`) in a single app |
| `packages/core` | Shared domain code: roles, permissions, API types, money, bill, order and table state, subscription rules, slug |
| `packages/client` | Frontend API client, realtime and session helpers |
| `packages/ui` | Design system: theme tokens, liquid glass styles, shared components |
| `packages/config` | Shared tsconfig and ESLint config |

## Commands

```sh
pnpm --filter @elo/api migration:run
pnpm --filter @elo/api migration:generate
```

Other scripts (`dev`, `build`, `lint`, `test`, `format`) run through Turborepo from the root. Env vars live in `.env` (see `.env.example`). Never commit secrets.

## Domain essentials

- **Roles**: `superadmin`, `elo_admin` (platform staff); `restaurant_admin`, `waiter`, `kitchen`, `cashier` (restaurant staff). RBAC via guards.
- **Table URL**: `/<restaurant-slug>/<table-token>`. The token is long, random, permanent and server-generated. The fixed link `/<slug>` is menu-only (read-only).
- **Table flow**: guest opens the menu, requests to open the table, the waiter validates it, the guest sends the order to the kitchen, the kitchen updates the status, the guest requests the bill, and only the waiter closes the table (which also ends the guest session). One shared order per table.
- **Guest session**: separate cookie-based session bound to the table, short-lived. It is not the JWT used by staff.
- **Orders**: statuses sent, received, preparing, ready. Cancellation rules depend on the role and on the status (see `packages/core`).
- **Subscription**: manual payments, 7-day grace period after the due date, then staff access is suspended (the public menu stays up).
- **Multi-tenancy**: every restaurant-owned entity carries the restaurant id and every query is filtered by it on the server.
- **Privacy (LGPD)**: only collect the restaurant manager's name and contact. Never collect personal data from guests.

## Principles

- TypeORM migrations are mandatory. `synchronize` stays off outside local development.
- Shared logic, types and validation go in `packages/core`. Check `core` and `@elo/ui` for an existing equivalent before creating something new.
- UI: theme values come from the tokens in `@elo/ui`, never hardcoded in components.

## Code Style

- Every documentation text should be written in English, even the comments.
- Avoid using comments; the code should speak for itself. However, for important sections that are difficult to understand without additional documentation, always use TSDoc (for TypeScript files).
- Well-structured code is essential. Always consider the best way to organize files and directories to avoid having "loose" files that make it difficult to understand the context in which they belong.