# Production Deployment Guide — Railway + Supabase

> **Auditoriya:** backend muhandislari va DevOps. Ushbu hujjat ishlab chiqarish (production) muhitiga deploy qilish bo'yicha **rasmiy, takrorlanadigan** protseduradir. Har bir qadam izchillik bilan, **idempotent** bajariladi.

**Stack:** Node.js 20 · Express 5 · Prisma ORM · PostgreSQL (Supabase) · JWT · Railway (compute).

---

## 0. Arxitektura va mas'uliyat chegaralari

```
┌─────────────────┐        HTTPS        ┌─────────────────────┐
│   Client / SPA  │ ──────────────────▶ │  Railway service    │
│ (Vercel/Netlify)│                     │  (Node 20, Express) │
└─────────────────┘                     └──────────┬──────────┘
                                                   │ TCP/SSL (sslmode=require)
                                                   ▼
                                  ┌────────────────────────────────┐
                                  │ Supabase Postgres              │
                                  │  • Pooler (port 6543) ← runtime│
                                  │  • Direct  (port 5432) ← migr. │
                                  └────────────────────────────────┘
```

| Mas'uliyat | Joy | Sabab |
|---|---|---|
| HTTP runtime | Railway | Stateless Node service, healthcheck va auto-restart |
| TLS termination | Railway edge | Avtomatik HTTPS, sertifikat boshqaruvi |
| Postgres | Supabase | Managed PG, pooler (PgBouncer), backup, RLS bo'lsa keyinroq |
| Migration o'tkazish | Railway start hook (`prisma migrate deploy`) | Atomik, deploy bilan bog'langan |
| Sekretlar | Railway Variables | Yagona manba, .env push qilinmaydi |

---

## 1. Old shartlar (prerequisites)

- [ ] Git repository (GitHub/GitLab)
- [ ] Railway hisobi: <https://railway.com>
- [ ] Supabase hisobi: <https://supabase.com>
- [ ] Frontend domeni (CORS uchun) — bo'lmasa `http://localhost:3000`
- [ ] Lokal: Node 20+ va npm 10+

---

## 2. Supabase — Postgres ma'lumotlar bazasi

### 2.1. Project yaratish

1. Supabase dashboard → **New project**.
2. **Region**: foydalanuvchilarga eng yaqin (O'zbekiston/Markaziy Osiyo uchun odatda `eu-central-1` Frankfurt yoki `ap-south-1` Mumbai).
3. **Database Password**: kuchli parol (parol menejerda saqlang — keyin URL'ga qo'yiladi).
4. Loyiha tayyor bo'lguncha kuting (~2 daqiqa).

### 2.2. Connection string'larni olish

**Project Settings → Database → Connection string** bo'limidan **2 ta** URL ni nusxa oling:

| Maqsad | Mode | Port | Prisma fielda | Diqqat |
|---|---|---|---|---|
| Runtime so'rovlar | **Transaction** (PgBouncer) | `6543` | `DATABASE_URL` | `?pgbouncer=true&connection_limit=1&sslmode=require` SHART |
| Migratsiya | **Session** / Direct | `5432` | `DATABASE_DIRECT_URL` | `?sslmode=require` |

Misol shakl:
```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

> **Diqqat — parolda maxsus belgi:** `@`, `#`, `:` kabi belgilar bo'lsa, ularni URL-encode qiling (`@` → `%40`).
> **Diqqat — IPv6:** Supabase pooler IPv4 bilan ishlaydi; Railway runtime ham IPv4. Direct connection (5432) endi default IPv6'da — agar ulanish problemasi bo'lsa, **IPv4 add-on** ni yoqing yoki direct uchun ham pooler endpointini ishlating.

### 2.3. Sanity check (lokal mashinada)

```bash
psql "postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require" -c "SELECT version();"
```

Agar `psql` versiyasi qaytsa — connection ishlayapti.

---

## 3. Loyihani Railway'ga ulash

### 3.1. Repository'ni push qilish

```bash
git init
git add .
git commit -m "chore: prepare for Supabase + Railway production"
git branch -M main
git remote add origin git@github.com:<you>/vet-clinic-api.git
git push -u origin main
```

> `.env` push qilinmasligini tekshiring (`git status` → `.env` ko'rinmasligi kerak).

### 3.2. Railway service yaratish

1. <https://railway.com> → **New Project** → **Deploy from GitHub repo**.
2. Repository tanlang. Railway `railway.json` ni avtomatik o'qiydi va **Nixpacks** bilan builder'ni belgilaydi.
3. Birinchi build **muvaffaqiyatsiz bo'lishi tabiiy** — env'lar hali yo'q. Variables qo'shgandan keyin re-deploy qilamiz.

### 3.3. Public domain ulash

Service → **Settings → Networking → Generate Domain**. Domen `https://<service>.up.railway.app` shaklida bo'ladi. Ushbu URL ni `API_PUBLIC_URL` ga yozasiz.

---

## 4. Environment variables (Railway → Variables)

> Hech qachon `.env` ni commit qilmang. Productionda qiymatlar **faqat Railway dashboard** orqali kiritiladi.

### 4.1. Majburiy o'zgaruvchilar

| Kalit | Qiymat | Izoh |
|---|---|---|
| `DATABASE_URL` | Supabase **Pooler** (port 6543, `pgbouncer=true&connection_limit=1`) | Runtime so'rovlar |
| `DATABASE_DIRECT_URL` | Supabase **Direct** (port 5432) | `prisma migrate deploy` uchun |
| `JWT_ACCESS_SECRET` | 48-baytlik tasodifiy base64url | Quyida generatsiya buyrug'i |
| `NODE_ENV` | `production` | App qattiqroq tekshiruvga o'tadi |
| `CORS_ORIGIN` | `https://app.example.com` (vergul bilan ko'p) | `*` taqiqlangan |
| `API_PUBLIC_URL` | Railway domain (https://...) | Swagger/root javob ham shu URL'ni ko'rsatadi |
| `TRUST_PROXY` | `true` | Railway proxy ortida — IP/scheme to'g'ri olinishi uchun |

**`JWT_ACCESS_SECRET` generatsiya:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 4.2. Tavsiya etilgan o'zgaruvchilar

| Kalit | Default | Tavsiya |
|---|---|---|
| `ACCESS_TOKEN_EXPIRES_MINUTES` | `15` | 15 — qisqa, refresh bilan balanslangan |
| `REFRESH_TOKEN_EXPIRES_DAYS` | `14` | 14 — UX/xavfsizlik balansi |
| `ENABLE_SWAGGER` | `false` (productionda) | Internal API uchun `true` qoldirsa bo'ladi |
| `RATE_LIMIT_MAX` | `300` | 15-daqiqalik oynada |
| `AUTH_RATE_LIMIT_MAX` | `40` | Auth endpointlarida qattiqroq |

### 4.3. Birinchi seed uchun (faqat ilk deploy'da)

| Kalit | Qiymat |
|---|---|
| `SEED_ADMIN_EMAIL` | `admin@vetclinic.uz` |
| `SEED_ADMIN_PASSWORD` | Kuchli parol (deploy'dan keyin DARHOL almashtiring) |
| `SEED_ADMIN_NAME` | Vet Clinic Admin |

### 4.4. **`PORT` ni QO'YMANG**

Railway `PORT` ni avtomatik beradi. Manual o'rnatsangiz, healthcheck ishlamaydi.

---

## 5. Migratsiya va birinchi deploy

### 5.1. Migration baseline mavjudligi

`prisma/migrations/20260505000000_init/migration.sql` repository'da bo'lishi shart. Bu fayl `prisma migrate deploy` ga "shu schemani ishlat" deb buyuradi. Yo'q bo'lsa — bo'sh DB qoladi.

### 5.2. Deploy oqimi

```
1. Railway push'ni sezadi → build boshlanadi
2. Build:   npm ci && npm run build         # prisma generate
3. Start:   npm run start:prod               # = prisma migrate deploy && node src/server.js
4. Healthcheck: GET /api/v1/health (60s timeout)
5. Trafik yangi versiyaga o'tadi
```

### 5.3. Birinchi marta seed qilish (faqat 1 marta)

Variant A — Railway CLI (tavsiya):
```bash
npm i -g @railway/cli
railway login
railway link        # repo ichida
railway run npm run db:seed
```

Variant B — Vaqtinchalik start command:
1. Service → **Settings → Deploy → Custom Start Command** ga `npm run db:seed && npm run start:prod` yozing.
2. Re-deploy.
3. **DARHOL** start command'ni asl holiga (`npm run start:prod`) qaytaring.

### 5.4. Verify (smoke test)

```bash
# Health
curl -s https://<service>.up.railway.app/api/v1/health | jq

# Login (admin)
curl -s -X POST https://<service>.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vetclinic.uz","password":"<seed-parol>"}' | jq

# Klinikalar
curl -s "https://<service>.up.railway.app/api/v1/clinics/nearby?lat=41.31&lng=69.24&radiusKm=10" | jq
```

---

## 6. Post-deploy mas'uliyatlar

| # | Vazifa | Qachon |
|---|---|---|
| 1 | Admin parolini almashtirish | **Birinchi soatda** |
| 2 | `SEED_ADMIN_PASSWORD` ni Railway'dan o'chirish | Seed muvaffaqiyatli bo'lgach |
| 3 | Custom domain ulash + DNS A/CNAME | Ishlab chiqarish trafigi boshlanishidan oldin |
| 4 | Supabase → Database → **Backups** ni yoqish (Pro tariff) | Birinchi haftada |
| 5 | Railway → **Observability** dashboard'ni ko'zdan kechirish | Doimiy |
| 6 | `/docs` (Swagger) productionda kerakmi? `ENABLE_SWAGGER=false` | Public API bo'lmasa |

---

## 7. Routine operatsiyalar

### 7.1. Yangi migratsiya qo'shish

```bash
# Lokalda (Supabase URL bilan emas — alohida dev DB!)
npm run db:migrate -- --name <change-name>
git add prisma/migrations/
git commit -m "feat(db): <change-name>"
git push                # Railway avtomatik deploy → migrate deploy
```

### 7.2. Rollback (migration)

Prisma'da to'g'ridan-to'g'ri rollback yo'q. Strategiya: **forward migration**.
1. Yangi migratsiya yozing — o'zgarishni teskariga aylantiruvchi.
2. Push qiling.
3. Bu yondashuv audit-friendly va xavfsiz.

### 7.3. Rollback (kod)

Railway → service → **Deployments** → kerakli versiya → **Redeploy**.

### 7.4. Sekretni almashtirish (key rotation)

`JWT_ACCESS_SECRET` ni almashtirsangiz, **barcha mavjud access tokenlar darhol bekor bo'ladi** (refresh tokenlar DBda hash bo'lib saqlanganligi sababli ular kuchda — foydalanuvchilar avto-relogin'siz davom etadi).

```bash
NEW=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")
# Railway → Variables → JWT_ACCESS_SECRET = $NEW
# Re-deploy avtomatik
```

---

## 8. Troubleshooting

| Belgisi | Sabab | Yechim |
|---|---|---|
| `prisma migrate deploy` "prepared statement already exists" deb yozadi | Pooler URL (6543) `directUrl` sifatida ishlatilgan | `DATABASE_DIRECT_URL` ni 5432 portli URL ga o'zgartiring |
| `Can't reach database server` | IPv6/IPv4 nomuvofiqligi yoki SSL flag yo'q | URL oxiriga `?sslmode=require` qo'ying; Supabase IPv4 add-on'ni yoqing |
| Healthcheck 502 | App `0.0.0.0` ga emas, `localhost` ga `listen` qilyapti | Express `app.listen(PORT)` bo'lsa, OK; `host` ko'rsatilmagan bo'lsi shart |
| `JWT_ACCESS_SECRET juda zaif` xatosi | Kalit 32 belgidan kalta | 48-baytli base64url generatsiya qiling |
| `CORS_ORIGIN="*"` productionda taqiqlanadi | env-validator | Aniq frontend domen(lar)ini yozing |
| `Too many connections` Supabase'da | Pooler ishlatilmayapti yoki `connection_limit` yuqori | Runtime URL'ga `&connection_limit=1` qo'shing |
| `429 Too Many Requests` test paytida | Rate limit + `TRUST_PROXY=false` | Productionda `TRUST_PROXY=true` |

---

## 9. Xavfsizlik checklist (deploy oldidan)

- [ ] `JWT_ACCESS_SECRET` 32+ belgi, tasodifiy
- [ ] `CORS_ORIGIN` aniq, `*` emas
- [ ] `NODE_ENV=production`
- [ ] `TRUST_PROXY=true`
- [ ] `.env` git'ga kirmayapti (`git ls-files | grep .env` → bo'sh)
- [ ] Migration baseline (`prisma/migrations/`) commit qilingan
- [ ] Admin parol seed'dan keyin almashtirildi
- [ ] Supabase Database Password parol menejerda saqlangan
- [ ] Swagger production'da kerakmi qaror qilingan
- [ ] Rate limit qiymatlari ko'zdan kechirilgan

---

## 10. Foydali havolalar

- [Railway docs — config-as-code](https://docs.railway.com/reference/config-as-code)
- [Railway docs — healthchecks](https://docs.railway.com/guides/healthchecks)
- [Supabase — Connection pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Prisma — `migrate deploy`](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)
- [Prisma — PgBouncer & connection pooling](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer)
