# Elo Digital - Project Structure Summary

## Monorepo Structure

```
elo-digital/
├── apps/
│   ├── api/                 # NestJS API (Backend)
│   ├── web-admin/           # Next.js Admin Dashboard
│   ├── web-restaurant/      # Next.js Restaurant Dashboard
│   ├── web-menu/            # Next.js Customer Menu
│   └── web-kitchen/         # Next.js Kitchen Display
├── packages/
│   ├── core/                # Shared types, validation, utils, RBAC
│   ├── ui/                  # Design System (Liquid Glass + Tailwind)
│   ├── config/              # Shared ESLint, Prettier, TS, Tailwind configs
│   └── database/            # TypeORM entities, migrations, repositories
├── docker-compose.yml       # Local development (PostgreSQL + Redis)
├── docker-compose.prod.yml  # Production deployment
├── nginx/                   # Nginx reverse proxy config
├── init-scripts/            # Database initialization scripts
├── .github/workflows/       # CI/CD pipelines
├── turbo.json               # Turborepo configuration
├── pnpm-workspace.yaml      # PNPM workspace config
└── package.json             # Root package.json
```

## Technology Stack

### Backend (API)
- **Framework**: NestJS 10.x with TypeScript
- **Database**: PostgreSQL 16 with TypeORM
- **Cache/Queue**: Redis 7
- **Auth**: JWT (access + refresh tokens) + Cookie sessions for table access
- **Real-time**: Socket.IO via NestJS WebSockets
- **Validation**: class-validator + class-transformer
- **Documentation**: Swagger/OpenAPI
- **Rate Limiting**: @nestjs/throttler with Redis store

### Frontend (4 Next.js Apps)
- **Framework**: Next.js 14 (App Router) with React 18
- **Styling**: Tailwind CSS v4 + Custom Design System
- **Components**: Radix UI primitives + shadcn/ui patterns
- **Icons**: Lucide React
- **State**: TanStack Query + Zustand
- **Forms**: React Hook Form + Zod
- **Animations**: CSS-based (respects prefers-reduced-motion)

### Design System (packages/ui)
- **Colors**: Green calm palette (primary: #15803D)
- **Typography**: Playfair Display SC (display) + Inter (body)
- **Effects**: Liquid Glass (backdrop-filter blur, translucent borders)
- **Components**: 40+ components (Button, Card, Modal, Table, etc.)
- **Dark Mode**: Full support with CSS variables
- **Accessibility**: WCAG 2.1 AA compliant

### Shared (packages/core)
- **Types**: TypeScript types for all entities
- **Validation**: Zod schemas for all inputs
- **Utils**: Formatters, validators, generators
- **RBAC**: Role-based access control matrix

## Key Features

### Multi-tenant Architecture
- Complete data isolation per restaurant
- Row-level security via TypeORM query filters
- Superadmin can access all data

### Table Session Management
- Permanent NFC/QR tokens per table
- Short-lived session cookies (4h)
- Waiter validation required to open table
- Session auto-cleanup on table close

### Real-time Updates
- Kitchen order status changes
- Waiter calls and validations
- Billing updates and splits
- Table status changes

### Subscription Management
- 7-day grace period after expiry
- Manual payment recording
- Automatic suspension/reactivation
- 7-day advance expiry notifications

### Role-Based Access Control
| Role | Permissions |
|------|-------------|
| superadmin | Full system access |
| admin_elo | Platform administration |
| admin_restaurant | Restaurant management |
| waiter | Tables, calls, validations, billing |
| kitchen | Order status updates |
| cashier | Billing, payments, reports |

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Local Development

```bash
# Clone repository
git clone <repo-url>
cd elo-digital

# Install dependencies
pnpm install

# Start databases
docker-compose up -d

# Copy environment template
cp .env.example .env
# Edit .env with your values

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

### Access URLs (Development)
- **API**: http://localhost:4000
- **Swagger**: http://localhost:4000/api/docs
- **Admin Dashboard**: http://localhost:3001
- **Restaurant Dashboard**: http://localhost:3002
- **Customer Menu**: http://localhost:3003
- **Kitchen Display**: http://localhost:3004

### Production Deployment

```bash
# Build all packages
pnpm build

# Build Docker images
docker-compose -f docker-compose.prod.yml build

# Deploy with production config
cp .env.production.example .env.production
# Edit .env.production with production values

docker-compose -f docker-compose.prod.yml up -d
```

## Database Schema

Key entities:
- **Restaurant** - Multi-tenant root entity
- **User** - Platform and restaurant users
- **Category/Product/Option** - Menu management
- **Table/TableToken/TableSession** - Table management
- **Order/OrderItem** - Order processing
- **CallWaiter** - Waiter calls
- **Bill/BillItem** - Billing and payments
- **Subscription/Payment** - Subscription management

## API Structure

```
/api/v1
├── /auth           # Authentication
├── /restaurants    # Restaurant management
├── /users          # User management
├── /menu           # Categories, products, options
├── /tables         # Tables, tokens, sessions
├── /orders         # Orders, items, status
├── /kitchen        # Kitchen display
├── /waiter         # Waiter calls, validations
├── /billing        # Bills, splits, payments
├── /subscriptions  # Subscriptions, payments
└── /admin          # Platform administration
```

## WebSocket Events

Real-time events for:
- Order status changes
- Kitchen updates
- Waiter calls
- Billing updates
- Table status changes

## Security Features

- JWT with short expiry + refresh tokens
- HttpOnly, Secure, SameSite cookies for table sessions
- Rate limiting (100 req/min per session/IP)
- Input validation on all endpoints
- SQL injection prevention via TypeORM
- CORS configured per environment
- Helmet.js security headers
- Input sanitization middleware

## Monitoring & Observability

- Structured logging (Pino)
- Request/response logging
- Error tracking with stack traces
- Health check endpoints
- Database connection pooling
- Redis connection monitoring

## CI/CD Pipeline

GitHub Actions workflow:
1. Lint + TypeCheck + Format
2. Unit + Integration Tests
3. Build all packages
4. Build Docker images
5. Deploy to Staging (develop branch)
6. Deploy to Production (main branch)

## License

Proprietary - Elo Digital