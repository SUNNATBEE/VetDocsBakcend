# Vet Clinic API

**Vet Clinic API** — O‘zbekistonda veterinariya klinikalarini bir joyda ko‘rish, foydalanuvchi joylashuvi atrofidagi **radius** bo‘yicha eng yaqin klinikalarni chiqarish, **ochiq/yopiq** holati (vaqt zonasi `Asia/Tashkent`), **telefon**, **sharhlar** va JWT asosidagi **access + refresh** autentifikatsiyasini ta’minlaydigan backend xizmati.

**Texnologiyalar:** Node.js 20 · Express 5 · Prisma ORM · **PostgreSQL (Supabase)** · JWT · Zod · OpenAPI 3 / Swagger UI · **Railway** deploy.

> **Production deploy:** to'liq qadamma-qadam yo'riqnoma — [`DEPLOYMENT.md`](./DEPLOYMENT.md). Production-uchun-tayyorlash bosqichida qilingan o'zgarishlar tarixi — [`PRODUCTION-CHANGES.md`](./PRODUCTION-CHANGES.md).

Loyiha tarkibida: REST API, OpenAPI 3 / Swagger UI hujjat va **professional Admin Web Panel** (`/admin`).

---

## Imkoniyatlar

| Bo‘lim | Tavsif |
|--------|--------|
| **Klinikalar** | `lat` / `lng` / `radiusKm` bo‘yicha yaqinlik, masofa (km), `isOpenNow`, `todayHours`, o‘rtacha reyting, sharhlar soni |
| **Bitta klinika** | Manzil, telefon, koordinatalar, ish jadvali (Json), sharhlar |
| **Sharhlar** | Auth bilan, har foydalanuvchi har klinikaga **bitta** sharh (qaytadan yuborilsa yangilanadi) |
| **Auth** | Register / login / refresh (**rotation + reuse-detection**) / logout, rolga asoslangan ruxsat (`USER` / `ADMIN`) |
| **Admin API** | `/api/v1/admin/*` — clinics CRUD, reviews, users (faqat `ADMIN`) |
| **Admin Panel** | `/admin` — vanilla JS SPA: dashboard, klinikalar, sharhlar, foydalanuvchilar |
| **Xavfsizlik** | Helmet, CORS, rate limit, refresh token DBda **SHA-256 hash**, JWT placeholder tekshiruvi |
| **Kuzatuv** | `X-Request-Id`, JSON javoblar uchun `success` / `error.code` / `meta.requestId` |
| **Hujjatlar** | OpenAPI 3 (`docs/openapi.yaml`) va Swagger UI (`/docs`) |

---

## Lokal ishga tushirish

### 1) Postgres tayyorlash (ikki variant)

**Variant A — Supabase (tavsiya etiladi, bepul):**
- https://supabase.com da yangi project yarating
- Project Settings → Database → **Connection string** dan **Transaction pooler** (port 6543) va **Session/Direct** (port 5432) URL larini nusxa oling
- To'liq tafsilot: [`DEPLOYMENT.md` § 2](./DEPLOYMENT.md#2-supabase--postgres-malumotlar-bazasi)

**Variant B — Lokal Postgres (Docker bilan):**
```bash
docker run --name vetclinic-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=vetclinic -p 5432:5432 -d postgres:16
```
Connection string: `postgresql://postgres:postgres@localhost:5432/vetclinic?schema=public`
(Lokal uchun `DATABASE_URL` va `DATABASE_DIRECT_URL` bir xil bo'lishi mumkin.)

### 2) Loyihani sozlash

```bash
cp .env.example .env
# .env'ni oching va DATABASE_URL / DATABASE_DIRECT_URL / JWT_ACCESS_SECRET ni qo'ying
npm install
npm run db:migrate         # birinchi migratsiya: --name init kerak bo'lsa beradi
npm run db:seed            # demo klinikalar + admin
npm run dev
```

- **API asosi:** `http://localhost:4000/api/v1`
- **Swagger UI:** `http://localhost:4000/docs`
- **Admin panel:** `http://localhost:4000/admin`
- **Boshlang‘ich admin:** `admin@vetclinic.uz` / `Admin12345!`  (`SEED_ADMIN_*` orqali o‘zgartirish mumkin)

> **Diqqat:** Production'da `JWT_ACCESS_SECRET` standart qiymatda qolsa, server ishga tushmaydi.
> Admin parolini birinchi kunda almashtiring.

---

## 🚀 Production deploy (Railway + Supabase)

To'liq, qadamma-qadam, troubleshooting va checklist bilan: **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**.

Qisqa ko'rinish:

1. **Supabase** project yarating → **Pooler** (6543) va **Direct** (5432) URL larini oling.
2. Repo'ni GitHub'ga push qiling. **Railway** → New Project → Deploy from GitHub repo.
3. Railway → **Variables** ga env'larni kiriting (`.env.example` shabloniga qarang). `PORT` ni QO'YMANG.
4. Build avtomatik (`npm ci && npm run build`) → Start `npm run start:prod` → `prisma migrate deploy` + Express.
5. Birinchi marta seed: `railway run npm run db:seed` → admin parolini DARHOL almashtiring.
6. Healthcheck: `/api/v1/health` (Railway 60s ichida 200 kutadi).

> **Production-uchun-tayyorlash bosqichida qilingan o'zgarishlar tarixi:** [`PRODUCTION-CHANGES.md`](./PRODUCTION-CHANGES.md).

---

## Loyiha tuzilmasi

```
src/
├── app.js                    # Express ilovasi (middleware, marshrutlar)
├── server.js                 # Postgres ulanish + HTTP server + graceful shutdown
├── config/
│   ├── env.js                # Muhit o‘zgaruvchilari (JWT placeholder tekshirish)
│   └── swagger.js            # OpenAPI + Swagger UI
├── routes/v1.router.js       # /api/v1 marshrutlari
├── common/
│   ├── errors/               # HttpError, error handler (Prisma P2002/P2025, JSON, payload)
│   ├── middleware/           # requestId, logger, rateLimit, requireAuth, requireRole, validate, notFound, asyncHandler
│   └── utils/                # haversine, openingHours (Asia/Tashkent)
├── infrastructure/database/  # Prisma client (singleton + connect/disconnect)
└── modules/
    ├── auth/                 # register/login/refresh/logout
    ├── clinics/              # nearby/detail/upsertReview
    ├── admin/                # ADMIN endpointlari
    └── health/               # health/version/uptime

public/admin/                 # Admin Web SPA
docs/openapi.yaml             # OpenAPI 3 spetsifikatsiya
prisma/schema.prisma          # Postgres schema (Role enum, Json field)
prisma/seed.js                # Demo klinikalar + admin
prisma/migrations/            # Versiyali migratsiyalar (baseline: 20260505000000_init)
railway.json                  # Railway build/deploy/healthcheck
Procfile                      # Procfile (Railway/Heroku-compatible)
.nvmrc                        # Node 20 — Nixpacks va lokal nvm uchun
.dockerignore                 # Container build context (kelajakdagi Docker uchun)
DEPLOYMENT.md                 # Supabase + Railway deploy yo'riqnomasi
PRODUCTION-CHANGES.md         # Production-readiness pass: nima va nega o'zgardi
```

---

## Asosiy marshrutlar (`/api/v1`)

| Metod | Yo‘l | Auth |
|--------|------|------|
| `GET`  | `/health` | — |
| `POST` | `/auth/register` | — |
| `POST` | `/auth/login` | — |
| `POST` | `/auth/refresh` | — |
| `POST` | `/auth/logout` | — |
| `GET`  | `/clinics/nearby?lat=&lng=&radiusKm=` | — |
| `GET`  | `/clinics/:id` | — |
| `POST` | `/clinics/:id/reviews` | `Bearer` (USER+) |
| `GET`  | `/admin/dashboard` | `Bearer` (ADMIN) |
| `GET/POST` | `/admin/clinics` | `Bearer` (ADMIN) |
| `GET/PATCH/DELETE` | `/admin/clinics/:id` | `Bearer` (ADMIN) |
| `GET`  | `/admin/reviews` | `Bearer` (ADMIN) |
| `DELETE` | `/admin/reviews/:id` | `Bearer` (ADMIN) |
| `GET`  | `/admin/users` | `Bearer` (ADMIN) |
| `PATCH` | `/admin/users/:id/role` | `Bearer` (ADMIN) |
| `DELETE` | `/admin/users/:id` | `Bearer` (ADMIN) |

To‘liq sxema va sinov uchun **Swagger UI** (`/docs`).

---

## NPM skriptlar

| Skript | Vazifa |
|--------|--------|
| `npm run dev` | nodemon bilan dev rejim |
| `npm start` | Sodda ishga tushirish (migratsiyasiz) |
| `npm run start:prod` | `prisma migrate deploy && node src/server.js` (Railway start) |
| `npm run build` | `prisma generate` (Railway build) |
| `npm run db:migrate` | `prisma migrate dev` (lokal migratsiya) |
| `npm run db:migrate:deploy` | `prisma migrate deploy` (production) |
| `npm run db:reset` | DBni butunlay reset qilish |
| `npm run db:seed` | Demo klinikalar + admin |
| `npm run db:studio` | Prisma Studio |

---

## Xavfsizlik nuanslari

- **Refresh rotation + reuse-detection.** Bekor qilingan refresh qaytadan kelsa, `REFRESH_REUSED` va foydalanuvchining barcha sessiyalari bekor qilinadi.
- **Token saqlash.** Admin SPA'da access — `sessionStorage`, refresh — `localStorage`. `httpOnly cookie` ga ko‘chirish — keyingi qadam.
- **Rate limit.** `429` da `RateLimit-*` sarlavhalari standart formatda.
- **JWT tekshiruvi.** Productionda `JWT_ACCESS_SECRET` standart/zaif bo‘lsa, server ishga tushmaydi.
- **Sharh yagonaligi.** `Review @@unique([clinicId, userId])` + `upsert`.

---

## Keyingi qadamlar

- **PostGIS** — katta hajmda indekslangan geo so‘rovlar (`ST_DWithin`)
- **HttpOnly cookie** asosidagi refresh tokenlar (CSRF himoyasi bilan)
- **Audit log** — admin amallari uchun
- **Fayl/media** — klinika rasmlari (S3-mos object storage)
- **CI** — `eslint`, `prettier`, `jest`/`supertest`

---

## Litsenziya

ISC.
