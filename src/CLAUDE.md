# `src/` — Backend Architecture

This directory is the Node service. Read this before touching anything under `src/`.

## Boot path

```
server.js → bootstrap()
  ├─ createApp()                    # app.js, sync — wires middleware + routes
  ├─ app.listen(env.port)           # opens port BEFORE the DB connects
  └─ connectDatabaseWithRetry()     # background loop, 5s interval, never blocks listen()
```

**Why split listen from connect:** Railway healthchecks must see the port open within a tight window. If we awaited Prisma first and the DB was warming, the deploy would flap. The `/api/v1/health` route does not touch Prisma, so it answers `200 OK` even during DB outages — by design.

Signals:
- `SIGINT`/`SIGTERM` → close HTTP server, then `prisma.$disconnect()`, then `exit(0)`. Hard 10s deadline (`setTimeout … exit(1)`).
- `unhandledRejection` and `uncaughtException` are logged but **do not exit**. Production resilience over crash-fast — revisit if you add a process manager that restarts on exit.

## Middleware order in `app.js` (the order matters)

1. `requestIdMiddleware` — assigns/echoes `X-Request-Id` (UUID v4 fallback).
2. `httpLogger(env)` — morgan; silent in `NODE_ENV=test`, `dev` format otherwise, custom format in production (includes `:req[x-request-id]`).
3. `cors(corsOptions)` — `origin: true` only when `CORS_ORIGIN` is unset/`*` and not production.
4. `helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: 'cross-origin' })` — CSP off because the admin SPA inlines scripts.
5. `compression()`.
6. `express.json({ limit: '1mb' })` — JSON parse errors are caught by the error handler (`entity.parse.failed`, `entity.too.large`).
7. **Static admin UI at `/admin`** + **public map page at `/map`** (both mounted before the global limiter so static assets aren't rate-limited). `/map` is the user-facing Google-Maps "5 km nearby" page; it consumes `/api/v1/clinics/nearby`, `/clinics/districts`, and `/config/public`.
8. `req.env = env` injection — services read tunables from `req.env`.
9. `globalLimiter(env)` — skips `/`, `/favicon.ico`, `/docs/*`.
10. `setupSwagger(app, env)` — mounts `/docs` (basic-auth gated) and `/docs/openapi.yaml`.
11. `GET /` — service banner with API + docs URLs.
12. `app.use(env.apiPrefix, createV1Router(env))` — `/api/v1/*`. Includes the small `GET /config/public` route that hands the Google Maps browser key to the `/map` SPA (returns `null` when `GOOGLE_MAPS_BROWSER_KEY` is unset).
13. `notFoundHandler` then `errorHandler` (must be last).

If you add middleware, place it before the static mount only if it must apply to `/admin` assets too.

## Module shape

Each feature slice under `modules/` follows the same four-file pattern:

```
<feature>.routes.js       # createXRouter(env) → express.Router(); attaches validate + asyncHandler
<feature>.controller.js   # thin: pulls req.validated.* / req.user, calls service, returns envelope
<feature>.service.js      # business logic; throws createHttpError on domain errors
<feature>.validation.js   # zod schemas exported by name
```

`auth/` adds `token.service.js` for JWT signing + refresh-token hashing.

**Controllers must stay thin.** They do not call Prisma directly, do not format errors, and do not branch on roles — that's the service's and middleware's job.

## Request lifecycle (happy path)

```
HTTP → requestId → logger → cors → helmet → compression → json
     → globalLimiter → /api/v1/<feature>
     → authLimiter (auth only) | requireAuth → requireRole (admin only)
     → validate(schema, source)                  # populates req.validated
     → asyncHandler(controller)                  # calls service, returns { success, data }
```

Failure path: any thrown error (sync or async) lands in `errorHandler.js`. Known shapes are mapped (`P2002` → 409, `entity.parse.failed` → 400, etc.); unknown errors become 500 and are logged.

## Where to extend

| You want to… | Touch |
|---|---|
| Add an endpoint to an existing module | that module's `routes.js` + matching schema in `validation.js` |
| Add a new feature area | `modules/<name>/` (4 files), then mount in `routes/v1.router.js` |
| Add a config knob | `config/env.js` only — never `process.env.*` elsewhere |
| Add a cross-cutting middleware | `common/middleware/`, then place in `app.js` at the right rung |
| Map a new external error code | `common/errors/errorHandler.js::mapKnownError` |

## What NOT to do

- Don't import `PrismaClient` outside `infrastructure/database/prisma.client.js`. Each instantiation opens its own pool.
- Don't read `process.env` inside services or middleware. Pull from `env` (closure or `req.env`).
- Don't return raw User/Clinic rows from services — sanitize via `publicUser()` / `clinicOut()` style helpers. `passwordHash` leaking is a P0.
- Don't add `try { … } catch` inside controllers to format an error response. Throw and let the handler do it.
