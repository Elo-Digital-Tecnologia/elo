# API (`apps/api`)

NestJS on Express, ESM, TypeORM + Postgres, Passport JWT, Vitest, ESLint.

`start:dev`, `build`, `lint`, `test` (unit), `db:test:prepare` + `test:e2e`, `migration:generate`. After changes run `lint` and `build`.

## Layout

```
src/
  main.ts, app.setup.ts (middlewares, pipes, interceptor, filter, adapters), app.module.ts
  config/      env.ts (Zod, nested config), cors.ts, duration.ts
  database/    data-source.ts, seeds/ (migrations/ empty until the first deploy)
  common/      constants.ts, database/, decorators/, exceptions/, filters/, guards/, interceptors/, pipes/, types/
  modules/<feature>/
    <feature>.module|controller|service.ts, <feature>.constants.ts
    dto/ entities/ exceptions/ guards/ strategies/ decorators/ types/ utils/
```

- Folder plural (`orders`), files and classes singular (`order.service.ts`, `OrderService`); one class per file, `<name>.<kind>.ts` → `<Name><Kind>`.
- Code used by one module stays there; by two or more, `common/` (or `@elo/core` when the web needs it too).
- `#/` = `src/` for anything outside the current module; relative inside it. Local imports end in `.js`.
- DTOs: `CreateOrderDTO`, `ListOrdersQueryDTO`, `OrderResponseDTO`; service inputs end in `Input`.

## Code

- Always `public`/`private`; dependencies as `private readonly`; `override` when overriding.
- Controllers read the request, call the service, return `ResponseDTO.from(...)`. Logic lives in services.
- Global guards: `AccessTokenGuard` (Passport `access-token`), `RolesGuard`, `SubscriptionGuard`; `@Public()`, `@Roles()`, `@RequirePermission()`, `@AllowSuspended()`, `@NoImpersonation()`. Guests: `TableSessionGuard` + `@CurrentTableSession()`.
- Per-route limits come from `RATE_LIMITS` (`common/constants.ts`).

## Responses and errors

- Every answer is `ApiResponse<T>` (`{ success, path, timestamp, data, error }`); files and `@Res()` handlers are sent as they are.
- Response DTOs: `@Exclude()` class, `@Expose()` fields, static `from()`, `implements` the core view when the wire types match.
- Input DTOs: `class-validator` or `@Field()` with core rules; `@Type(() => Number)` for numeric query params.
- Errors: a class extending `ApiHttpException`, one per file in the module's `exceptions/`. Codes in `ApiErrorCode` (`@elo/core/api/api-error-code`), blocks of 1000 per domain, new codes at the end of their block; detail types in `ApiErrorDetailMap`. Messages are technical English, never UI text.

```ts
export class OrderNotFoundException extends ApiHttpException<ApiErrorCode.ORDER_NOT_FOUND> {
    constructor() {
        super({
            code: ApiErrorCode.ORDER_NOT_FOUND,
            message: 'Order not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
```

## Entities

- Extend `BaseEntity` (uuid `id`, `createdAt`) when the table has both. Tables plural `snake_case`; every column has explicit `name` and `type`. FK column next to its relation, typed `Relation<T>`. Indexes and FKs are declared in the entity. Register with `TypeOrmModule.forFeature`.

## Config

- Only `src/config/env.ts` reads `process.env`. Groups: `APP_*`, `PG_*`, `JWT_*`, `SESSION_*`, `THROTTLE_*`, `RETENTION_*`, `PUSH_*`; durations as `60s`, `15min`, `4h`, `30d`. Read with `configService.getOrThrow('jwt.accessTokenSecret', { infer: true })`. New vars go in `env.ts` and `.env.example`.
