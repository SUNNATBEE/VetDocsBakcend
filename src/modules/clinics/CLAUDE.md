# `modules/clinics/` — Public Clinic Catalog

The user-facing surface: nearby search, clinic detail, and authenticated review write.

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/clinics/nearby?lat&lng&radiusKm&address?&district?` | public | Default `radiusKm = 10`, max `200`. `district` (Toshkent tuman key) is optional; when present without `lat`/`lng` the search center falls back to the district center. |
| GET | `/clinics/districts` | public | Catalog for the `/map` dropdown — returns `{ key, name, lat, lng, clinicCount }` per Toshkent tuman. Cached `public, max-age=300`. |
| GET | `/clinics/:id` | public | Includes up to 50 most recent reviews. |
| POST | `/clinics/:id/reviews` | bearer | Upsert (one review per user per clinic). |

`/nearby` and `/districts` are mounted **before** `/:id` so literal paths match first — don't reorder.

## `clinic.service.js`

### `listNearby({ lat, lng, radiusKm, district? })`
- Computes a lat/lng bounding box from `radiusKm` and queries Prisma with `where: { latitude: {gte,lte}, longitude: {gte,lte}, district? }`. The `district` filter (when set) goes into the same `where` clause.
- DTOs include `distanceKm` (rounded to 0.01), `isOpenNow`, `todayHours`, `averageRating` (rounded to 0.1), `reviewCount`, and now `district`. Opening-hours JSON is **not** returned by this endpoint — clients use `todayHours` for the list view.
- **Known scaling limit.** Bbox is in the Prisma `where`, but the haversine refine + sort still runs in Node. After 2026-05-16 the seed holds ~60 rows; fine at this scale. Past a few hundred clinics, push the haversine into Postgres (`earthdistance` / raw SQL) and drop the JS pass.

### `listDistricts()`
- `prisma.clinic.groupBy({ by: ['district'], where: { district: { not: null } }, _count })` to compute per-tuman row count, then enriched with `name`/`lat`/`lng` from `clinic.constants.js::TASHKENT_DISTRICTS`.
- Order is the constants-file order (alphabetical-ish) — the API returns a stable list even if some tumans currently have zero clinics.

### `getById(id)`
- Returns full opening-hours JSON plus the latest 50 reviews (with `user.id/name/email` masked).
- 404 → `CLINIC_NOT_FOUND`.

### `upsertReview({ clinicId, userId, rating, comment })`
- Pre-checks clinic existence (throws 404 with `CLINIC_NOT_FOUND` rather than letting the upsert fail with a foreign-key error).
- Uses the `(clinicId, userId)` unique index. A second review by the same user replaces the first — that's the product behavior, not a bug.
- `comment` is normalized to `null` when empty/whitespace-only (Zod `.trim()` runs first; the service treats empty-after-trim as no comment).

## DTO helpers

- `publicReview(review)` — embeds `user.id`, `user.name`, and a **masked** email (`xx***@domain`). Never return the full email from public endpoints.
- `averageRating(ratings)` — `null` for zero reviews; rounded to one decimal otherwise.
- `maskEmail(email)` — defensive on malformed inputs (`'***'` fallback).

## Validation

```js
nearbyQuerySchema:
  lat       coerce.number, [-90, 90], optional
  lng       coerce.number, [-180, 180], optional
  address   trimmed string (3..500), optional — mutually exclusive with lat/lng
  radiusKm  coerce.number, (0, 200], default 10
  district  enum(TASHKENT_DISTRICT_KEYS), optional
  // superRefine: if address → lat/lng forbidden.
  //              if district → lat/lng optional (defaults to district center).
  //              else → lat & lng required.

clinicIdParamsSchema:
  id        non-empty string

reviewBodySchema:
  rating    int, [1, 5]
  comment   trimmed string ≤ 2000, optional
```

`coerce.number()` is required because query params arrive as strings. The bounds match the lat/lon physical range exactly — don't loosen them. `district` uses `z.enum(TASHKENT_DISTRICT_KEYS)` so unknown values are rejected at the boundary — the service trusts the input.

## What NOT to do

- **Don't return a clinic's full review list** from `listNearby`. The current shape (counts + average) is the contract; clients fetch the detail page for the actual reviews.
- **Don't expose user emails unmasked** from any public endpoint. Admin endpoints (`modules/admin/`) are the only place full emails surface.
- **Don't call `isOpenNow` with a string when you have an object.** It accepts both, but the parsed-object path skips an unnecessary `JSON.parse`. Prisma already deserializes `Json` columns.
- **Don't add a "delete my review" public endpoint** without thinking about admin moderation interaction — currently the only delete path is the admin one, and that's intentional moderation policy.
