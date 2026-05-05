# `modules/admin/` — Admin Console API

Backs the SPA at `/admin` (see `public/admin/CLAUDE.md`). Every route here is gated by `requireAuth(env)` + `requireRole('ADMIN')` at the router level — added once in `admin.routes.js`, do not reattach per route.

## Endpoint map

```
GET    /admin/dashboard                  → counts + 5 latest reviews
GET    /admin/clinics    ?page&pageSize&q
POST   /admin/clinics
GET    /admin/clinics/:id
PATCH  /admin/clinics/:id
DELETE /admin/clinics/:id

GET    /admin/reviews    ?page&pageSize&q
DELETE /admin/reviews/:id

GET    /admin/users      ?page&pageSize&q
PATCH  /admin/users/:id/role            { role: 'USER' | 'ADMIN' }
DELETE /admin/users/:id
```

Pagination defaults: `page=1`, `pageSize=20` (capped at 100). Search `q` is trimmed string, optional, max 120 chars.

## Service patterns

### Pagination
`paginate(page, pageSize) → { skip, take }`. Use it in every list query. Always return `{ total, page, pageSize, items }` — the SPA's `pagerHtml` reads exactly those keys.

### List filters
`q` becomes an `OR` over a small set of `contains` filters (`name`, `city`, `address` for clinics; `comment` + nested `clinic.name` + nested `user.email` for reviews; `email` + `name` for users). Postgres `contains` is **case-sensitive** by default with Prisma. If you need case-insensitive search, switch to `{ contains: q, mode: 'insensitive' }` — but check that the call sites in the SPA expect that change first.

### Output sanitization
`clinicOut`, `userOut`, `reviewOut` are the only sanctioned response shapes. They include `_count.reviews` when the query asked for it (`include: { _count: { select: { reviews: true } } }`).

### Mutations

- **Create clinic** — inserts directly, returns with `_count`.
- **Update clinic** — pre-checks existence (throws 404 explicitly so the client gets `CLINIC_NOT_FOUND` rather than Prisma's generic 404). Builds a partial `patch` from a whitelist (`name, phone, address, city, latitude, longitude`). `openingHours` is replaced wholesale when present (no field-level merge).
- **Delete** (clinic / review / user) — catches `P2025` and rethrows as `*_NOT_FOUND`. Cascade deletes are configured in `schema.prisma` so deleting a clinic also drops its reviews; deleting a user drops their reviews and refresh tokens.

### RBAC self-protection

`updateUserRole` and `deleteUser` accept an `actorId` (the calling admin's id) and refuse:

- demoting yourself out of `ADMIN` → 400 `CANNOT_DEMOTE_SELF`
- deleting yourself → 400 `CANNOT_DELETE_SELF`

These guard against an admin accidentally locking themselves out. **They do not guard against the last admin demoting/deleting another admin** — if you need that property, add a `prisma.user.count({ where: { role: 'ADMIN' } })` check before mutating. We've not done that yet because the seed creates one admin and the operator is expected to know what they're doing.

## Validation (`admin.validation.js`)

`openingHoursSchema` enforces:
- All seven keys (`mon`..`sun`) are present.
- Each slot is either `null` (closed) or `{ open: 'HH:MM', close: 'HH:MM' }` with `open < close`.
- Time regex is strict: `^([01]\d|2[0-3]):[0-5]\d$` — `'24:00'` is rejected.

`clinicCreateSchema` requires the full hours object. `clinicUpdateSchema = clinicCreateSchema.partial()` so PATCH can send any subset.

`userRoleUpdateSchema` uses `z.enum(['USER', 'ADMIN'])` — keep this list aligned with the Prisma `Role` enum.

## When extending

- **Adding a new admin entity** (e.g., "Pets"): copy the clinics quartet (routes/controller/service/validation), add to `admin.routes.js`, and update the SPA's `ROUTES` array + corresponding view function.
- **Adding a new role**: change `Role` in `schema.prisma`, regenerate the migration, update `userRoleUpdateSchema.role`'s `z.enum`, and broaden `requireRole(...)` calls only where the new role should have access.
- **Don't** introduce per-route `requireRole` calls — the router-level guard is the security invariant. If you need finer-grained checks (e.g., "an editor can only edit their own assignments"), do that inside the service against `req.user.id`, not by toggling middleware.
