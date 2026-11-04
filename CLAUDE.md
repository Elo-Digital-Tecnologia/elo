# Elo Digital

Startup offering digital products. First product, **Elo Cardápio**: a subscription digital menu for restaurants. Guests scan a QR code / NFC tag, order, and waiter, kitchen and cashier handle it in real time. Payments are not processed by the system. When something is missing or unclear, ask instead of inventing.

## Monorepo

pnpm + Turborepo, TypeScript ESM, Node >= 26.

| Path | What |
| --- | --- |
| `apps/api` | NestJS + TypeORM (Postgres). See `apps/api/CLAUDE.md` |
| `apps/web` | Next.js (App Router) + Tailwind: public menu, restaurant panels, Elo admin |
| `packages/core` | Shared domain logic and API types, by domain (`@elo/core/<domain>/<file>`) |
| `packages/client` | API client, realtime and session (`@elo/client/<area>/<file>`) |
| `packages/ui` | Design system: tokens, styles, components (`@elo/ui/components/<group>/<file>`) |
| `packages/config` | Shared tsconfig and ESLint |

`dev`, `build`, `lint`, `test` run from the root (Turborepo). `NODE_ENV` lives in the root `.env`; each app has its own `.env` (see `.env.example`). Never commit secrets.

## Domain

- Roles: `superadmin`, `elo_admin`; `restaurant_admin`, `manager`, `waiter`, `kitchen`, `cashier`.
- Table link `/<slug>/<table-token>` (permanent random token); `/<slug>` is the read-only menu.
- Guest opens the menu, asks to open the table, the waiter validates, orders go to the kitchen, the guest asks for the bill, only the waiter closes the table. Guests use a short cookie session, not the staff JWT.
- Subscription: manual payments, 7-day grace, then staff access is suspended (menu stays up).
- Every restaurant-owned row carries the restaurant id and every query filters by it on the server.
- LGPD: only the manager's name and contact; no guest personal data.

## Rules

- English for code, comments and docs. Few comments; TSDoc only where the code cannot explain itself.
- No magic values: name them in a constants file of their module, in core when shared, or in the env when they vary by deployment.
- UI text lives only in `apps/web/app/_lib/messages/`. Core, client, ui and the API send codes and data, never text (`@elo/ui` reads its texts from `UiTextsProvider`).
- Shared logic and types go to `packages/core`; check core and `@elo/ui` before writing something new. Theme values come from `@elo/ui` tokens.
- Folders by subject; one class/component per file; import each file directly (no barrels).
- Naming: `camelCase` values, `PascalCase` types, `UPPER_SNAKE_CASE` constants and enum members, `kebab-case` files. `interface` for shapes, `type` for unions. `import type` for type-only imports.
- The database schema synchronizes in development; generate the first migration only before the first production deploy.
- Commits: Conventional Commits, lowercase message.
