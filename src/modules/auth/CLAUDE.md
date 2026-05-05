# `modules/auth/` — Authentication

JWT access token + opaque (random hex) refresh token persisted in Postgres. **Refresh-token rotation with reuse detection** — the security-critical part of this module.

## Endpoints

All four are rate-limited by `authLimiter(env)` (40 / 15 min by default — shared bucket).

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password, name? }` | `{ user, accessToken, refreshToken }` |
| POST | `/auth/login` | `{ email, password }` | `{ user, accessToken, refreshToken }` |
| POST | `/auth/refresh` | `{ refreshToken }` | `{ user, accessToken, refreshToken }` (new pair) |
| POST | `/auth/logout` | `{ refreshToken? }` | `{ ok: true }` |

`logout` accepts an empty body — used when the client only wants to drop local state.

## Token model

### Access token (`token.service.js::signAccessToken`)
- HS256, signed with `env.jwtAccessSecret`.
- Payload: `{ role }`. `sub = user.id`. Expiry: `${env.accessTokenExpiresMinutes}m` (default 15).
- `role` is embedded so `requireRole('ADMIN')` doesn't hit the DB on every request.
- **Implication:** if you change a user's role, existing access tokens still carry the old role until they expire. For elevated security, rotate `JWT_ACCESS_SECRET` on the same day you demote/promote — that invalidates all live tokens. The codebase does not do this automatically.

### Refresh token
- Raw value: `crypto.randomBytes(48).toString('hex')` — 96 hex chars, sent to the client.
- DB stores `sha256(raw)` as `tokenHash`, which has a unique index. The raw token is **never** logged or returned again after issuance (apart from the response of the issuing call).
- `expiresAt = now + env.refreshTokenExpiresDays * 24h` (default 14 days).
- `revokedAt` tracks rotation/logout.

## Service flows

### `register(input, env)`
1. `bcrypt.hash(password, SALT_ROUNDS=12)`. The hash runs **before** the create call — even if the email is taken, the cost is paid. This is intentional: bcrypt latency on a unique-collision still makes user-enumeration timing harder. Don't optimize this away.
2. `prisma.user.create`. `P2002` is converted to 409 `EMAIL_EXISTS`. (We do reveal whether an email exists at registration time — UX over enumeration-resistance, an explicit product trade-off.)
3. Issue access + refresh.

### `login(input, env)`
1. `findUnique({ email })`. If missing, still calls `bcrypt.compare` against `false` to keep the response time roughly constant.
2. Single generic error `INVALID_CREDENTIALS` for both "no such email" and "wrong password" — login does **not** leak existence.

### `refresh({ refreshToken: raw }, env)`
The reuse-detection logic — read carefully before changing:

1. `tokenHash = sha256(raw)`. Lookup by hash.
2. If no record → 401 `INVALID_REFRESH`.
3. **If `revokedAt` is set** → token is being replayed. Revoke **every** non-revoked refresh token for that user (`revokeAllUserSessions`) and throw 401 `REFRESH_REUSED`. This is the core anti-theft signal: a stolen-and-rotated token resurfacing means either the legitimate client or the attacker is acting; revoking all sessions forces a fresh login on every device.
4. If `expiresAt <= now` → 401 `REFRESH_EXPIRED`.
5. **Atomic rotation** in a `prisma.$transaction`: stamp the old token `revokedAt = now`, create a new token with a fresh hash. Return both new tokens.

### `logout({ refreshToken })`
Best-effort: mark the matching, non-revoked token as revoked. Returns `{ ok: true }` even when no record matched — clients shouldn't be able to probe for valid tokens via logout.

## Validation (`auth.validation.js`)

- `emailField` trims and lowercases — the DB stores lowercased emails. **Never bypass this** by writing direct `prisma.user.create({ email: req.body.email })`.
- Password rules: ≥8 and ≤128 chars on register. Login only enforces non-empty (so legacy short passwords still log in).
- `refreshToken` minimum length 20 (real ones are 96 hex chars; 20 is the floor for "obviously not a placeholder").

## Things to be careful about

- **Don't expose `passwordHash`.** The `publicUser()` helper is the only sanctioned shape for returning a user.
- **Don't add an "active" flag** or soft-delete to `User` without also wiring it into `requireAuth` and `refresh` — currently a deleted user cascades and refresh tokens go with them, but a soft-delete would silently keep tokens valid.
- **Don't widen `requireRole` beyond what controllers need.** Accept the smallest set per route.
- **If you add a new role**, update the `Role` enum in `prisma/schema.prisma` and the Zod enum in `admin.validation.js::userRoleUpdateSchema`. Both must agree.
