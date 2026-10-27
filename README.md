# Elo Digital

Monorepo (pnpm + Turborepo). Fonte de verdade: `REFERENCE.md`.

```
apps/api         Nest + TypeORM + Postgres + WebSocket + Swagger (/docs)
apps/menu        Next. Cardápio público: /<slug> (consulta) e /<slug>/<token> (mesa)
apps/restaurant  Next. Dashboard do restaurante, garçom, cozinha
apps/admin       Next. Dashboard Elo Digital (superadmin/equipe)
packages/core    Papéis, estados, regras (cancelamento, assinatura, conta), tipos de API
packages/ui      Tema único (src/theme.css) + componentes liquid glass
packages/client  Cliente HTTP, hook de WebSocket, sessão de funcionário
packages/config  tsconfig e ESLint compartilhados
```

## Desenvolvimento

```sh
cp .env.example .env        # defina JWT_SECRET (16+) e SUPERADMIN_KEY (24+, ex.: openssl rand -hex 32)
docker compose up -d db     # Postgres em localhost:5433
pnpm install && pnpm build
set -a && . ./.env && set +a
pnpm --filter @elo/api migration:run
pnpm dev                    # api :3001, menu :3000, restaurant :3002, admin :3003
```

Smoke manual da API: `SUPERADMIN_KEY=... node apps/api/test/smoke.mjs` (API rodando).

## Notas

- `synchronize` fica desligado; mudanças de schema via migration (`pnpm --filter @elo/api migration:generate -d ... `).
- Cookie de mesa e WebSocket do cliente exigem API e menu no mesmo domínio registrável.
- Caixa (P1), relatórios e imagens otimizadas (P2) não foram implementados.
