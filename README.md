# Elo Digital

Monorepo para a plataforma **Elo Digital** — sistema de cardápio digital e gestão de restaurantes.

## 🏗️ Arquitetura

```
elo-digital/
├── apps/
│   ├── api/                 # NestJS API (Backend)
│   ├── web-admin/           # Next.js - Dashboard Elo Digital (Superadmin)
│   ├── web-restaurant/      # Next.js - Dashboard Restaurante
│   ├── web-menu/            # Next.js - Cardápio Público (Clientes)
│   └── web-kitchen/         # Next.js - Tela Cozinha (TV)
├── packages/
│   ├── core/                # Shared: types, validation, utils, RBAC
│   ├── ui/                  # Design System: tokens, componentes, liquid glass
│   ├── config/              # ESLint, Prettier, TypeScript, Tailwind configs
│   └── database/            # TypeORM entities, migrations, repositories
├── docker-compose.yml       # PostgreSQL + Redis
└── turbo.json              # Turborepo pipeline
```

## 🚀 Quick Start

### Pré-requisitos
- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose (para PostgreSQL + Redis)

### Instalação

```bash
# Instalar dependências
pnpm install

# Subir banco de dados
docker-compose up -d

# Copiar variáveis de ambiente
cp .env.example .env
# Editar .env com seus valores

# Rodar migrations
pnpm db:migrate

# Iniciar desenvolvimento (todos os apps)
pnpm dev
```

### URLs de Desenvolvimento
- **API**: http://localhost:4000
- **Swagger**: http://localhost:4000/api/docs
- **Admin Dashboard**: http://localhost:3001
- **Restaurant Dashboard**: http://localhost:3002
- **Cardápio Público**: http://localhost:3003
- **Tela Cozinha**: http://localhost:3004

## 📦 Pacotes Compartilhados

### `@elo-digital/ui` — Design System
Tokens centralizados + componentes shadcn/ui customizados com efeito **liquid glass**.

```tsx
import { Button, Card, Input } from '@elo-digital/ui';
import '@elo-digital/ui/styles/globals.css';
```

**Tokens disponíveis:**
- `colors` — Paleta verde calma (light/dark)
- `spacing` — Escala 4px base
- `typography` — Playfair Display SC (display) + Inter (corpo)
- `shadows`, `borderRadius`, `transitions`, `breakpoints`, `zIndex`

### `@elo-digital/core` — Types & Utils
```ts
import { z } from '@elo-digital/core/validation';
import { formatCurrency, cn } from '@elo-digital/core/utils';
import { UserRole, OrderStatus } from '@elo-digital/core/types';
```

### `@elo-digital/database` — TypeORM
```ts
import { Restaurant, Product, Order } from '@elo-digital/database/entities';
import { AppDataSource } from '@elo-digital/database/data-source';
```

## 🎨 Design System

### Paleta de Cores (Verde Calmo)
| Token | Light | Dark |
|-------|-------|------|
| Primary | `#15803D` | `#4ADE80` |
| Secondary | `#059669` | `#34D399` |
| Accent | `#D97706` | `#FBBF24` |
| Background | `#F0FDF4` | `#052E16` |
| Surface | `#FFFFFF` | `#0F172A` |

### Tipografia
- **Display**: Playfair Display SC (elegante, para headlines)
- **Corpo**: Inter (moderno, legível, para UI e dados)
- **Mono**: JetBrains Mono (código, números)

### Liquid Glass
```tsx
import { Card } from '@elo-digital/ui/components/composite/Card';

<Card variant="glass">Conteúdo com efeito vidro</Card>
<Card variant="glass-dark">Versão escura</Card>
```

## 🛠️ Scripts Principais

```bash
# Build all
pnpm build

# Dev all (com turbo)
pnpm dev

# Lint all
pnpm lint

# Format code
pnpm format

# Typecheck all
pnpm typecheck

# Test all
pnpm test

# Database
pnpm db:generate  # Gerar migration
pnpm db:migrate   # Rodar migrations
pnpm db:studio    # Abrir TypeORM CLI
```

## 🔐 Autenticação & RBAC

### Perfis (Roles)
| Role | Descrição |
|------|-----------|
| `superadmin` | Acesso total à plataforma Elo Digital |
| `admin_elo` | Administrador da equipe Elo Digital |
| `admin_restaurant` | Administrador do restaurante |
| `waiter` | Garçom (mesas, chamados, validações) |
| `kitchen` | Cozinha (comandas, status) |
| `cashier` | Caixa (contas, pagamentos) |

### Fluxo de Mesa (Cliente)
1. Escaneia QR Code / NFC → `/restaurante/token-mesa`
2. Cria sessão via cookie (4h expiry)
3. Monta pedido com observações/adicionais
4. **"Abrir mesa"** → Garçom valida
5. **"Enviar comanda"** → Vai para cozinha (WebSocket)
6. Acompanha status em tempo real
7. Chama garçom quando necessário
8. Solicita fechamento → Garçom valida e encerra sessão

## 📚 Documentação da API

Swagger UI disponível em `/api/docs` quando rodando localmente.

Principais módulos:
- `AuthModule` — JWT (interno) + Cookie Session (mesa)
- `RestaurantsModule` — CRUD + multi-tenant isolation
- `MenuModule` — Categorias, produtos, opções, imagens
- `TablesModule` — Mesas, tokens NFC/QR, sessões
- `OrdersModule` — Pedidos, itens, status, WebSocket events
- `KitchenModule` — Tela cozinha, transições de status
- `WaiterModule` — Chamados, validações de mesa
- `BillingModule` — Contas, divisão, taxa de serviço
- `SubscriptionsModule` — Planos, pagamentos, suspensão

## 🧪 Testes

```bash
# Unit tests
pnpm test

# E2E tests (Playwright)
cd apps/web-admin && pnpm test:e2e
```

## 📦 Deploy

### Docker (Produção)
```bash
# Build images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Variáveis de Produção Obrigatórias
- `JWT_SECRET` (64 chars aleatórios)
- `SESSION_SECRET` (64 chars aleatórios)
- `SUPERADMIN_KEY` (64 chars hex)
- `DATABASE_URL` (PostgreSQL gerenciado)
- `REDIS_URL` (Redis gerenciado)

## 📄 Licença

Proprietário — Elo Digital