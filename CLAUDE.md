# Vet Clinic API — Project Guide

> Express 5 + Prisma 6 + Postgres backend for an Uzbekistan vet-clinic catalog.
> Stateless JWT auth with rotating refresh tokens, admin RBAC, a vanilla-JS admin SPA at `/admin`, and a public Google-Maps-powered "find clinics within 5 km" page at `/map`.
> User-facing strings, error messages, and API responses are written in **Uzbek** — preserve that when editing.

---

## Stack at a glance

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js `>=20` (CommonJS) | Long LTS, native `fetch`/`crypto.randomUUID`. |
| HTTP | Express 5 | `asyncHandler` propagates rejected promises natively, but the helper is kept for clarity. |
| ORM | Prisma 6 | `directUrl` split for Supabase/Neon poolers (PgBouncer). |
| DB | Postgres (Supabase prod, Neon-friendly) | JSONB for `Clinic.openingHours`. |
| Validation | Zod | All controllers consume `req.validated.{body,query,params}` — never `req.body` directly. |
| Auth | `jsonwebtoken` (HS256) + sha256-hashed refresh tokens in DB | Reuse-detection revokes all sessions on replay. |
| Hashing | `bcryptjs` (12 rounds) | Pure-JS; portable across Railway/Alpine. |
| Docs | `swagger-ui-express` + `docs/openapi.yaml` | Basic-auth gated in production. |
| Deploy | Railway (Procfile + `railway.json`) | Healthcheck: `/api/v1/health`. |

---

## Common commands

```bash
npm run dev               # nodemon, watches src/
npm start                 # node src/server.js (= start:prod)
npm run db:migrate        # prisma migrate dev (uses DATABASE_DIRECT_URL)
npm run db:migrate:deploy # CI/prod migration
npm run db:seed           # seed admin + 4 sample clinics
npm run db:studio         # Prisma Studio
node --check src/<file>   # quick syntax sanity check (no test suite yet)
```

There is **no test runner configured**. When changes warrant verification, run a focused `node -e` smoke test (see how `openingHours` was verified in commit history) or hit the dev server with curl.

---

## Repository layout

```
src/
  server.js              # bootstrap, signal handling, DB reconnect loop
  app.js                 # createApp() — wires middleware + routes + /admin + /map static
  config/                # env loader, Swagger setup
  routes/v1.router.js    # /api/v1 mount points (incl. GET /config/public)
  modules/               # feature slices (auth, clinics, admin, health)
  common/                # cross-cutting middleware, errors, utils
  infrastructure/database/prisma.client.js
prisma/                  # schema, migrations, seed   → see prisma/CLAUDE.md
public/admin/            # vanilla-JS admin SPA       → see public/admin/CLAUDE.md
public/map/              # public Google-Maps "5 km nearby" SPA (no toolchain)
docs/openapi.yaml        # OpenAPI 3 spec served at /docs
docs/frontend/           # frontend team docs (architecture + integration + changelog)
docs/frontend-api-kit/   # copy-paste ESM fetch wrappers for student teams
```

Each folder under `src/` and the two top-level data folders has its own `CLAUDE.md`. Read those when you touch the area — they encode invariants that aren't visible from the code alone.

---

## Hard conventions (do not violate)

1. **Response envelope.** Every success path returns `{ success: true, data: ... }`. Every error path returns `{ success: false, error: { code, message, details? }, meta: { requestId } }`. The error handler enforces this — throw `createHttpError(status, message, { code, details })` from services, never `res.status(...).json(...)` directly.
2. **Validated input only.** Controllers read `req.validated.body|query|params`. If you add a route, attach `validate(schema, source)` first. Raw `req.body` is a code-review red flag.
3. **Async errors.** Wrap every async route handler in `asyncHandler(...)`. Express 5 propagates promise rejections natively, but the helper keeps the pattern consistent and explicit.
4. **Prisma access.** Import the singleton from `src/infrastructure/database/prisma.client.js`. Never `new PrismaClient()` elsewhere — it leaks connections.
5. **Uzbek messages.** All user-visible `message` strings (validation errors, 4xx/5xx) are in Uzbek. Keep tone consistent (formal, no slang). Internal logs and code comments stay in English.
6. **Roles in JWT.** The access token carries `role` in its payload so `requireRole('ADMIN')` does no DB lookup. If you change the role-bearing model, you must invalidate existing tokens (rotate `JWT_ACCESS_SECRET`).
7. **Env loading.** `loadEnv()` is the **only** place that reads `process.env.*` for app config. Add new vars there with explicit defaults and prod-time validation. Modules read from `req.env` or the `env` injected via factory functions like `createV1Router(env)`.

---

## Security posture

- `JWT_ACCESS_SECRET` must be ≥32 chars and not on the placeholder list — production refuses to start otherwise.
- `CORS_ORIGIN="*"` is **rejected in production** (`config/env.js`).
- `ENABLE_SWAGGER=true` in production requires `SWAGGER_USERNAME` + `SWAGGER_PASSWORD`; basic-auth uses `crypto.timingSafeEqual` to avoid timing attacks.
- `helmet` runs with default headers + cross-origin RP `cross-origin`. CSP is **disabled** because the admin SPA uses inline scripts.
- Rate limits: global (default 300/15min) skips `/`, `/favicon.ico`, `/docs/*`. Auth endpoints have a tighter limiter (40/15min).
- Refresh-token reuse detection: presenting a `revokedAt`-stamped token revokes **all** of that user's active sessions.
- `passwordHash` never leaves the DB — `publicUser()` strips it before returning.

---

## Recent audit (2026-05-05)

Three correctness/observability fixes were applied — keep them in mind when reviewing similar code:

1. **`src/common/utils/openingHours.js`** — added a `null`/non-object guard before `hours[dayKey]`. Without it, a malformed `openingHours` JSON crashed the request with `TypeError`. The schema enforces shape on write, but defense-in-depth is cheap here.
2. **`src/common/errors/errorHandler.js`** — 5xx errors are now logged unconditionally (with `requestId` + method + URL). The previous `NODE_ENV !== 'production'` guard meant production failures were silent. Stack traces are still stripped from the response in production.
3. **`src/modules/auth/auth.validation.js`** — `logoutSchema` was over-engineered (`.partial().optional().default({})`); reduced to `.default({})`.

Open follow-ups (not yet acted on):

- `src/modules/clinics/clinic.service.js::listNearby` loads every `Clinic` row inside the bbox and filters in JS. After the 2026-05-16 seed expansion the table holds ~60 rows; still fine, but the JS-side haversine filter remains the long-term scaling concern. The `(latitude, longitude)` index already exists — when row count grows past a few hundred, tighten the Prisma `where` to use the precomputed bbox + haversine refine in JS only.
- No cron job for refresh-token cleanup (`expiresAt < now()` rows accumulate forever). Cheap to add via `pg_cron` or an external scheduler.

---

## 2026-05-16 — district + public map

A user-facing feature was added on top of the existing nearby search:

- **`Clinic.district String?`** column (Postgres index) — populated for Toshkent clinics, `null` for other cities. Migration: `prisma/migrations/20260516000000_add_clinic_district/`.
- **Seed expanded** to 60 Toshkent clinics (12 tumans × 5) plus 2 other-city samples. The seed still wipes `Review`/`Clinic` — do not run against a populated production DB.
- **`GET /clinics/nearby`** accepts an optional `district` query param. When `district` is provided without `lat`/`lng`, the controller falls back to the district's center coordinates from `clinic.constants.js`.
- **`GET /clinics/districts`** — catalog endpoint (key, display name, center coords, clinic count) used to populate the dropdown on `/map`.
- **`GET /config/public`** — exposes `googleMapsBrowserKey` (from env) so the `/map` SPA can lazy-load the Google Maps JS API. Returns `null` when the key is unset and the page falls back to list-only mode.
- **`public/map/`** — vanilla-JS page, no build step. Geolocation button → `/clinics/nearby?lat&lng&radiusKm=5`. Districts dropdown → `/clinics/nearby?district=…&radiusKm=…`.
- **`GOOGLE_MAPS_BROWSER_KEY`** added to `config/env.js` and `.env.example`. In Google Cloud Console restrict the key to **Maps JavaScript API** + HTTP referrer of your deployed origin.
- **`railway.json`** `buildCommand` now runs `npx prisma generate && npx prisma migrate deploy` so schema changes apply automatically on every deploy.

---

## Token-budget hints for Claude

`.claudeignore` filters generated/auto-content (lockfiles, migration SQL, the OpenAPI spec, vendored UI assets) so they don't bloat tool results. If you genuinely need one of those files, read it explicitly with `Read` — the filter only affects glob/grep result sets.

Avoid running `npm install` or `prisma generate` unless asked. They are slow and write large amounts to stdout.
