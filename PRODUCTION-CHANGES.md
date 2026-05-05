# Production Readiness — Changes Log

> **Maqsad:** loyihani **Railway (compute) + Supabase (Postgres)** kombinatsiyasiga professional darajada deploy qilishga tayyorlash.
> **Sana:** 2026-05-05
> **Maqomi:** Tayyor — keyingi qadam: lokal verifikatsiya → `git push` → Railway re-deploy.

Ushbu fayl ishlab chiqarish-uchun-tayyorlash bosqichida **nima**, **qaerda**, va **nega** o'zgartirilganini hujjatlashtiradi. Reviewer (yoki kelajakdagi siz) shu hujjatni o'qib, har bir qarorni tushunishi mumkin.

---

## TL;DR

| O'lchov | Avval | Keyin |
|---|---|---|
| DB platforma yo'riqnomasi | Neon (eslatma) | **Supabase (rasmiy)** |
| Migration baseline | Yo'q (`prisma/migrations/` mavjud emas) | **Bor** (`20260505000000_init`) |
| Production env-validator | Yumshoq (warn) | **Qattiq** (process exit + 32-belgi minimum) |
| `TRUST_PROXY` default | `false` | **production'da `true`** |
| `CORS_ORIGIN="*"` production'da | Ruxsat etilgan | **Taqiqlangan** |
| Node engines | `>=18.18 <23` | **`>=20.0.0 <23.0.0`** |
| `.gitignore` qamrovi | Minimal | **Hammasini qamragan** (lokal DB, sekretlar, build artifaktlari) |
| Procfile / railway.json | Takrorlanish bor edi | **Bitta yagona manba** (railway.json) |
| Healthcheck timeout | 30s | **60s** (cold-start zaxirasi) |
| Deployment docs | Bitta README bo'limi | **Alohida `DEPLOYMENT.md`** + bu changelog |

---

## 1. O'zgartirilgan fayllar

### 1.1. `.gitignore` — qayta yozildi

**Sabab:** `prisma/dev.db` (SQLite artefakti) repository'da edi; `.env.*` qoidasi noaniq edi; OS/editor junk qamrab olinmagan edi; sertifikat/PEM fayllar uchun himoya yo'q edi.

**Asosiy qo'shilganlar:**
- `prisma/dev.db`, `prisma/*.db`, `*.sqlite*`
- `.env` + `.env.*` (lekin `!.env.example` bilan istisno)
- `*.pem`, `*.key`, `*.crt`
- `.railway`, `.netlify` platforma direktoriyalari
- `coverage/`, `.nyc_output`, `dist/`, `build/`

**Effekti:** sekretlar va artefaktlar repository'ga aralashib ketmaydi.

### 1.2. `.env.example` — qayta yozildi

**Sabab:** Neon-specific URL shabloni edi; Supabase pooler/direct ajratuvchi parametrlari tushunarsiz edi; `PORT` haqida Railway ogohlantirishi yo'q edi.

**Asosiy o'zgarishlar:**
- **Supabase shabloni** ikki URL bilan: pooler (6543, `pgbouncer=true&connection_limit=1`) va direct (5432).
- `PORT` haqida ogohlantirish: productionda Railway o'zi beradi.
- `CORS_ORIGIN="*"` productionda qabul qilinmasligi haqida izoh.
- `TRUST_PROXY=true` Railway uchun tavsiya.

**Diqqat:** parolda maxsus belgilar bo'lsa URL-encode qilish haqida izoh qo'shildi.

### 1.3. `src/config/env.js` — qattiqroq tekshiruvlar

**Sabab:** zaif sekretlar bilan production'da yashirin xatolik xavfi; `CORS_ORIGIN="*"` productionda jiddiy xavfsizlik xatosi; `TRUST_PROXY` qo'lda yoqilishi kerak edi.

**Konkret o'zgarishlar:**
- `JWT_ACCESS_SECRET` minimum **32 belgi** (avval 24 edi).
- Placeholder ro'yxati kengaydi: `REPLACE-WITH-STRONG-RANDOM-32+chars`, `dev-only-CHANGE-ME-...` ham bloklanadi.
- `CORS_ORIGIN` "*" yoki bo'sh — production'da **xato tashlaydi**, deploy boshlanmaydi.
- `TRUST_PROXY` default endi `isProduction` ga bog'liq (Railway/proxy ortida avtomatik `true`).
- `DATABASE_DIRECT_URL` yo'q bo'lsa production'da ogohlantirish (migratsiyalar pooler orqali ishlamaydi).

### 1.4. `railway.json` — chidamlilik

**Sabab:** cold-start uzunroq bo'lishi mumkin (Prisma generate + migrate deploy); tashqi observability uchun replikalar soni aniq bo'lmagani yaxshi.

**O'zgarishlar:**
- `healthcheckTimeout`: 30 → **60s**.
- `numReplicas: 1` aniq ko'rsatildi (kelajakda horizontal scaling uchun mo'ljal).

### 1.5. `Procfile` — soddalashtirildi

**Sabab:** Railway `railway.json` ni Procfile'dan ustun ko'radi; `release:` sintaksisi Railway'da ishlamaydi; takrorlanish chalkashlikka olib keladi.

**O'zgarish:**
```diff
- web: npm run start:prod
- release: npm run db:migrate:deploy
+ web: npm run start:prod
```

`npm run start:prod` ichida `prisma migrate deploy` allaqachon bor — alohida release fazaga ehtiyoj yo'q.

### 1.6. `package.json` — `engines` aniqlashtirildi

**Sabab:** Node 18 LTS hayot tsikli oxiriga yaqinlashmoqda; Nixpacks Node tanlovi aniq bo'lishi kerak.

```diff
- "node": ">=18.18 <23"
+ "node": ">=20.0.0 <23.0.0",
+ "npm": ">=10.0.0"
```

`.nvmrc` (`20`) qo'shildi — Nixpacks va lokal `nvm use` ikkalasi ham shu faylni o'qiydi.

---

## 2. Yangi fayllar

### 2.1. `prisma/migrations/20260505000000_init/migration.sql`

**Sabab:** `prisma migrate deploy` faqat mavjud migratsiyalarni bajaradi. `prisma/migrations/` papkasi yo'q bo'lsa — boshlang'ich schema deploy bo'lmaydi va Railway'da `User`, `Clinic` jadvallari yaratilmaydi.

**Yondashuv:** `npx prisma migrate diff --from-empty --to-schema-datamodel` orqali baseline SQL generatsiya qilindi. Bu — Prisma'ning rasmiy va xavfsiz usuli.

**Tekshirish:** Supabase'da deploy'dan keyin Table Editor'da `User`, `RefreshToken`, `Clinic`, `Review` jadvallari va `Role` enum'ini ko'rishingiz kerak.

### 2.2. `prisma/migrations/migration_lock.toml`

Provider'ni qulflaydi (`postgresql`) — lokalda kimdir tasodifan SQLite'ga o'tkazsa, Prisma xatolik tashlaydi.

### 2.3. `.nvmrc`

Pin: Node 20. Nixpacks va `nvm` ikkalasi ham shu faylni hurmat qiladi.

### 2.4. `.dockerignore`

Hozircha `Dockerfile` yo'q (Nixpacks ishlatilyapti), lekin keyinchalik kontainerga o'tilsa — context kichik, build tez bo'ladi.

### 2.5. `DEPLOYMENT.md`

To'liq, qadamma-qadam Supabase + Railway deploy guide. Ichida:
- Arxitektura diagrammasi
- Old shartlar
- Supabase project + connection string
- Railway service + environment variables (jadval bilan)
- Migration va birinchi seed
- Smoke test
- Routine operatsiyalar (yangi migration, rollback, secret rotation)
- Troubleshooting jadvali
- Xavfsizlik checklist

### 2.6. `PRODUCTION-CHANGES.md` (ushbu fayl)

Audit izi: nima o'zgardi, nega.

---

## 3. Effekt o'zgarmagan, lekin tekshirilgan

| Fayl | Holat | Eslatma |
|---|---|---|
| `prisma/schema.prisma` | OK | `directUrl` allaqachon to'g'ri sozlangan |
| `src/server.js` | OK | Graceful shutdown, signal handling joyida |
| `src/infrastructure/database/prisma.client.js` | OK | Singleton pattern, productionda log faqat `error` |
| `src/app.js` | OK | Helmet, compression, requestId, rate limit zinapoyali tartibda |

---

## 4. Deploy oldidan tasdiq (verification gate)

Quyidagilar **bajarilgan** deb tasdiqlanadi:

- [x] `.env` `git status` da ko'rinmaydi
- [x] `prisma/dev.db` repository'dan istisno qilingan
- [x] Migration baseline (`prisma/migrations/20260505000000_init/`) mavjud
- [x] `package.json` engines = Node 20+
- [x] `railway.json` healthcheck `/api/v1/health` ga
- [x] env-validator productionda `JWT_ACCESS_SECRET<32` va `CORS_ORIGIN="*"` ni rad etadi
- [x] `Procfile` va `railway.json` o'rtasida ziddiyat yo'q

Bajarilishi kerak (foydalanuvchi tomonidan):

- [ ] Supabase project yaratildi va 2 ta URL olindi
- [ ] Railway service yaratildi va environment variables to'ldirildi
- [ ] Birinchi deploy muvaffaqiyatli, healthcheck yashil
- [ ] `npm run db:seed` bir marta ishga tushirildi
- [ ] Admin parol almashtirildi
- [ ] `SEED_ADMIN_*` o'zgaruvchilari Railway'dan o'chirildi

---

## 5. Buzilishga olib kelishi mumkin bo'lgan o'zgarishlar (breaking)

Hech qanday public API o'zgarmadi. Lekin **lokal ishlab chiquvchilar** uchun:

1. **`.env` yangilanishi kerak.** `.env.example` ni yangidan diff qiling — yangi izohlar va Supabase shabloni bor.
2. **Lokal Postgres URL Prisma uchun:** `DATABASE_DIRECT_URL` ni `DATABASE_URL` bilan bir xil qo'ysangiz bo'ladi (lokal'da pooler kerak emas).
3. **`prisma migrate dev` birinchi marta yangi migration qo'shadi:** lokal DB bo'sh bo'lsa, faqat `migrate deploy` yoki `migrate dev` bilan baseline'ni qo'llang.
4. **Node 20+ shart:** Node 18'da `npm install` engine warning beradi, lekin ishlaydi (default). Ammo CI'da xatolikka olib kelishi mumkin.

---

## 6. Keyingi tavsiya etilgan qadamlar (scope tashqari)

- **CI:** GitHub Actions — `npm ci`, `prisma validate`, `eslint`, (oxirida) `jest`/`supertest`.
- **HttpOnly refresh cookie:** Admin panelida `localStorage`'dan voz kechib, `Set-Cookie HttpOnly Secure SameSite=Strict` ga o'tish.
- **Audit log:** `/api/v1/admin/*` endpointlari uchun struktura qilingan log (clinic ID, action, actor).
- **Sentry / Logtail:** xato kuzatuv (productionda).
- **Supabase RLS:** agar to'g'ridan-to'g'ri DB'ga client kirsa kerak bo'lsa (hozirda yo'q — barcha so'rovlar API orqali).

---

**Tasdiqlovchi:** Senior Backend Engineer
**Sana:** 2026-05-05
