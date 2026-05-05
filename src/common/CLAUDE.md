# `src/common/` — Cross-cutting Utilities

Three folders: `errors/`, `middleware/`, `utils/`. Every feature module depends on these — changes here ripple everywhere, so prefer additive edits.

## `errors/`

### `httpError.js`
`createHttpError(status, message, { code?, details? }) → Error`. The error has `.status`, `.statusCode`, optional `.code`, optional `.details`. **This is the only sanctioned way to throw a controlled HTTP error from a service.**

### `errorHandler.js`
The terminal Express error handler. Behavior:

- Maps known external error shapes in `mapKnownError`:
  - `entity.parse.failed` → 400 `INVALID_JSON`
  - `entity.too.large` → 413 `PAYLOAD_TOO_LARGE`
  - Prisma `P2002` → 409 `CONFLICT`
  - Prisma `P2025` → 404 `NOT_FOUND`
- Status precedence: `err.status` → `err.statusCode` → mapped → `500`.
- Code precedence: `err.code` → mapped → `STATUS_TO_CODE[status]` → `'INTERNAL_ERROR'`.
- `exposeMessage` is true when the error carries a status (i.e., was intentionally thrown). Otherwise the response gets the mapped fallback or `'Server xatosi'`.
- **All 5xx are logged** (`requestId + method + originalUrl + stack`) — production included. This was changed in the 2026-05-05 audit; don't re-introduce a `NODE_ENV !== 'production'` gate around it.
- In production, 5xx response messages are replaced with `'Server xatosi'` and the stack is stripped from the body. Non-prod includes `error.stack`.
- Response body shape is the contract: `{ success: false, error: { code, message, details? }, meta: { requestId } }`.

### Adding a new mapped error
Add a branch to `mapKnownError` returning `{ status, code, message }`. Don't widen `STATUS_TO_CODE` unless you're introducing a brand-new HTTP status to the API surface.

---

## `middleware/`

### `requestId.js`
Trusts an inbound `X-Request-Id` only when it is a non-empty string ≤128 chars. Otherwise mints a `crypto.randomUUID()`. Attached as `req.requestId` and echoed back in the response header.

### `httpLogger.js`
Morgan. `dev` format in development; production uses a custom format that includes the request id. Returns a no-op middleware when `NODE_ENV=test`.

### `rateLimiter.js`
Two limiters built on `express-rate-limit`:

- `globalLimiter(env)` — applied app-wide, skips `/`, `/favicon.ico`, `/docs/*`.
- `authLimiter(env)` — attached to `/auth/*` routes (register, login, refresh, logout share one bucket).

Both return the same JSON envelope on 429. The handler reads `req.requestId`, so the limiter must be mounted **after** `requestIdMiddleware`.

When `TRUST_PROXY=true`, Express trusts one hop (`set('trust proxy', 1)`); the limiter then uses the forwarded IP as the key. If you change the proxy chain, also reconsider this number — getting it wrong lets clients spoof their IP.

### `requireAuth.js` + `requireRole(...roles)`
- `requireAuth(env)` → middleware that parses `Authorization: Bearer <jwt>`, verifies with `env.jwtAccessSecret`, and sets `req.user = { id, role }`. Specific failure codes:
  - missing/malformed header → 401 `UNAUTHORIZED`
  - `TokenExpiredError` → 401 `TOKEN_EXPIRED`
  - everything else → 401 `INVALID_TOKEN`
- `requireRole(...allowedRoles)` → must be placed **after** `requireAuth`. Returns 401 if `req.user` is missing (defensive), 403 if the role isn't in the allow-set.

The admin router applies both as router-level middleware so individual routes don't repeat the wiring.

### `validate.js`
`validate(schema, source = 'body')`. `source` ∈ {`'body'`, `'query'`, `'params'`}. On success, populates `req.validated[source]` with the **parsed** (coerced/transformed) data — controllers must read from there, not from `req[source]`. On failure, throws 400 `VALIDATION_ERROR` with `details = result.error.flatten()`.

If you need cross-field validation, use `z.object(...).refine(...)` inside the schema. Don't add post-parse checks in the controller.

### `asyncHandler.js`
`asyncHandler(fn)` wraps an async handler so rejections forward to `next`. Express 5 already does this for awaited handlers, but the wrapper documents intent and stays compatible if anyone returns a non-awaited promise.

### `notFound.js`
Trailing 404 handler — throws a `createHttpError(404, …)` so the regular error handler formats it.

---

## `utils/`

### `haversine.js`
`distanceKm(lat1, lon1, lat2, lon2) → number`. Pure function, mean-Earth radius `6371`. Used by `clinic.service::listNearby` to filter and sort results.

### `openingHours.js`
- `TZ = 'Asia/Tashkent'` — hard-coded; product is Uzbekistan-only.
- `getNowInTimezone(date?)` returns `{ dayKey: 'mon'..'sun', minutes: 0..1439 }` using `Intl.DateTimeFormat` (no third-party tz lib).
- `isOpenNow(openingHoursJson)` accepts either a parsed object or a JSON string. Returns:
  - `{ open: false, reason: 'invalid_hours' }` — JSON parse failed or value is null/non-object.
  - `{ open: false, dayKey, reason: 'closed_today' }` — day slot missing or null.
  - `{ open: false, dayKey, reason: 'invalid_slot' }` — `HH:MM` parse failed.
  - `{ open: <bool>, dayKey, opensNext?: { open, close } }` — happy path.

The 2026-05-05 audit added the null/non-object guard. **Don't remove it** — Postgres JSONB allows nulls even when the Prisma schema marks the column required, and old seed data may pre-date schema tightening.

The format on disk:
```json
{ "mon": { "open": "09:00", "close": "19:00" }, ..., "sun": null }
```
A null day = closed. Times are local Tashkent time, no DST handling needed (UZT is fixed UTC+5).
