# `prisma/` — Database Schema, Migrations, Seed

Postgres is the only supported database. The legacy `prisma/dev.db` SQLite file is `.gitignore`d — ignore it.

## Connection model (Supabase / Neon)

`schema.prisma` declares two URLs:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // pooled (PgBouncer) for runtime
  directUrl = env("DATABASE_DIRECT_URL") // direct (5432) for migrations & seed
}
```

Prisma migrations cannot run through PgBouncer in transaction mode — the migrator opens advisory locks and prepared statements that PgBouncer breaks. **Always set `DATABASE_DIRECT_URL` in any environment that runs `prisma migrate`** (including local dev with Supabase). `loadEnv()` warns when this is missing in production.

Pooled URL must include `?pgbouncer=true&connection_limit=1` per Prisma's PgBouncer guidance. Don't drop those query params.

## Models

```
User           — id (cuid), email (unique), passwordHash, name?, role, timestamps
RefreshToken   — tokenHash (unique), userId (FK cascade), expiresAt, revokedAt?, createdAt
Clinic         — name, phone, address, city, district?, lat/lng (Float),
                 openingHours (Json), timestamps
Review         — clinicId (FK cascade), userId (FK cascade), rating (Int 1..5), comment?, timestamps
                 unique (clinicId, userId)
```

`Clinic.district` is the canonical Toshkent tuman key (`Chilonzor`, `Yunusobod`, …). It's nullable so non-Toshkent rows stay `null`. The full enum lives in `src/modules/clinics/clinic.constants.js::TASHKENT_DISTRICTS` — keep DB values in sync with that list (it's the source of truth for both validation and the `/clinics/districts` dropdown).

Cascade rules are deliberate:
- `User → RefreshToken` cascade: deleting a user wipes their sessions immediately.
- `User → Review` cascade and `Clinic → Review` cascade: orphan reviews aren't useful.

Indexes:
- `User(role)` — admin-list filtering.
- `RefreshToken(userId)`, `RefreshToken(expiresAt)` — token lookup + future cleanup queries.
- `Clinic(city)`, `Clinic(district)`, `Clinic(latitude, longitude)` — list filters and the future bbox query.
- `Review(clinicId)`, `Review(userId)` — join paths.

Don't add `@@index` lightly — every index slows writes. If you're adding one, name the workload that uses it.

## Migrations workflow

Local dev (against `DATABASE_DIRECT_URL`):

```bash
npm run db:migrate           # prisma migrate dev — creates SQL + applies + regenerates client
npm run db:reset             # prisma migrate reset — drops schema, reapplies, reseeds
```

Production / CI:

```bash
npm run db:migrate:deploy    # prisma migrate deploy — applies pending migrations only
```

`build` and `postinstall` both run `prisma generate` so the client is fresh after every install/deploy.

Migration files are immutable history. **Never edit a committed migration's SQL.** If a migration is wrong, write a follow-up migration that fixes the state. The only file in `prisma/migrations/<ts>_<name>/` you should ever hand-edit before commit is the most recent, still-uncommitted one.

## Seed (`seed.js`)

Run via `npm run db:seed` or automatically by `prisma migrate reset`. Behavior:

1. **Wipes** `Review` and `Clinic` rows (via `deleteMany`) and reinserts the full fixture: **60 Toshkent clinics** (12 tumans × 5 named patterns from `clinicNamePatterns`) plus 2 other-city samples. Users are not touched.
   - Tuman list and center coordinates live in the seed file and mirror `src/modules/clinics/clinic.constants.js`. If you add a tuman, edit both files.
   - The 5 clinics per tuman are placed at small offsets around the center (~0.5–1 km apart) so the `/map` 5 km radius search returns multiple hits.
2. Upserts a single admin keyed by `SEED_ADMIN_EMAIL`. If the user exists, only the `role` is updated to `ADMIN` — password and name are preserved. If the user does not exist, it's created with `bcrypt.hash(SEED_ADMIN_PASSWORD, 12)`.
3. Upserts 5 demo USERs and attaches one review per demo user to two anchor clinics (`24/7 Emergency Vet — Chilonzor` and `PetCare Markazi — Yunusobod`), so the detail page has non-empty review lists out of the box.

**Operational reminders:**

- Production seed must run **once**, then `SEED_ADMIN_PASSWORD` must be rotated immediately (the admin should change it via the app or by re-running `db:seed` with a new env value).
- The seed wiping `Clinic`/`Review` is intentional for a fresh dev DB. **Do not run seed against a production DB that already has user data** unless you mean to wipe reviews. If you need a non-destructive prod seed, add a separate script — don't change this one.
- Seed logs the admin password to stdout. Keep that off the deploy pipeline's persistent logs.

## Adding a model — checklist

1. Add the `model` block to `schema.prisma` with explicit `@id`, `@unique`, and `@@index` declarations.
2. Decide cascade behavior on every relation. Default is restrict — be intentional.
3. Run `npm run db:migrate` locally with a descriptive name (`prisma migrate dev --name add_pets`).
4. Add a service module under `src/modules/<name>/` (see `src/CLAUDE.md` for the four-file pattern).
5. If the model needs seed data, extend `seed.js` and update the wipe step accordingly.
6. Update `docs/openapi.yaml` so the new endpoints appear in `/docs`.
