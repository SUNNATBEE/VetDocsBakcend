# `modules/clinics/` — Public Clinic Catalog

The user-facing surface: nearby search, clinic detail, and authenticated review write.

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/clinics/nearby?lat&lng&radiusKm` | public | Default `radiusKm = 10`, max `200`. |
| GET | `/clinics/:id` | public | Includes up to 50 most recent reviews. |
| POST | `/clinics/:id/reviews` | bearer | Upsert (one review per user per clinic). |

`/nearby` is mounted **before** `/:id` so the literal path matches first — don't reorder.

## `clinic.service.js`

### `listNearby({ lat, lng, radiusKm })`
- Loads **every** `Clinic` row with `reviews: { select: { rating: true } }`. Filtering and sorting happen in JS via `distanceKm`.
- Returns lightweight DTOs: includes `distanceKm` (rounded to 0.01), `isOpenNow`, `todayHours`, `averageRating` (rounded to 0.1), `reviewCount`. Opening-hours JSON is **not** returned by this endpoint — clients use `todayHours` for the list view.
- **Known scaling limit.** This will degrade past a few hundred clinics. The intended fix is a Postgres bbox prefilter (`latitude BETWEEN $minLat AND $maxLat AND longitude BETWEEN $minLon AND $maxLon`) computed from `radiusKm`, then haversine-refine the survivors. Don't ship that change without also indexing `(latitude, longitude)` — the index already exists in `prisma/schema.prisma`, so the query plan should be ready.

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
  lat       coerce.number, [-90, 90]
  lng       coerce.number, [-180, 180]
  radiusKm  coerce.number, (0, 200], default 10

clinicIdParamsSchema:
  id        non-empty string

reviewBodySchema:
  rating    int, [1, 5]
  comment   trimmed string ≤ 2000, optional
```

`coerce.number()` is required because query params arrive as strings. The bounds match the lat/lon physical range exactly — don't loosen them.

## What NOT to do

- **Don't return a clinic's full review list** from `listNearby`. The current shape (counts + average) is the contract; clients fetch the detail page for the actual reviews.
- **Don't expose user emails unmasked** from any public endpoint. Admin endpoints (`modules/admin/`) are the only place full emails surface.
- **Don't call `isOpenNow` with a string when you have an object.** It accepts both, but the parsed-object path skips an unnecessary `JSON.parse`. Prisma already deserializes `Json` columns.
- **Don't add a "delete my review" public endpoint** without thinking about admin moderation interaction — currently the only delete path is the admin one, and that's intentional moderation policy.
