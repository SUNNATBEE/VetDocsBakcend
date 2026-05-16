# Vet Clinic Frontend — Loyiha Strukturasi va Komanda Vazifalari

> **Backend:** Express 5 + Prisma 6 + Postgres (`/api/v1`)
> **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
> **Til:** UI matnlari **o'zbek tilida** (backend response'lariga moslab)
> **Komanda:** 6 kishi — Yahyo, Suhrob, Doniyor, Akbar, Sunnatbek (Tech Lead), Hayot
> **Repository:** GitHub — branch-based collaboration
> **Loyiha boshlanishi:** 2026-05-06 | **Maqsad:** 5 hafta ichida MVP

---

## Mundarija

1. [Texnologik stack](#1-texnologik-stack)
2. [Loyiha strukturasi](#2-loyiha-strukturasi)
3. [Hard konvensiyalar](#3-hard-konvensiyalar)
4. [Backend ↔ Frontend mapping](#4-backend--frontend-endpoint-mapping)
5. [Komanda vazifalari](#5-komanda-vazifalari)
6. [Git workflow](#6-git-workflow)
7. [Setup va ishga tushirish](#7-setup-va-ishga-tushirish)
8. [Sprint roadmap](#8-sprint-roadmap)
9. [Definition of Done](#9-definition-of-done)
10. [Resurslar](#10-resurslar)

---

## 1. Texnologik stack

| Qatlam | Tanlov | Sabab |
|---|---|---|
| Framework | **Next.js 15** (App Router) | SSR/ISR, SEO, file-based routing |
| Til | **TypeScript** (strict mode) | Type-safety, IDE qo'llab-quvvatlovi |
| Styling | **Tailwind CSS v4** | Utility-first, tez prototip |
| UI kit | **shadcn/ui** + Radix UI | Accessible, maxsus komponentlar |
| Server state | **TanStack Query v5** | Caching, refetching, mutations |
| Client state | **Zustand** | Yengil, boilerplate yo'q |
| Forms | **React Hook Form** + **Zod** | Backend Zod schema'ga moslash |
| HTTP | **Axios** + interceptor | Auto refresh-token, response envelope |
| Icons | **Lucide React** | shadcn bilan mos |
| Maps | **Leaflet** + `react-leaflet` | Bepul, OpenStreetMap |
| i18n | **next-intl** | Uzbek + Rus + Ingliz (Phase 2) |
| Lint/Format | ESLint + Prettier + Husky + lint-staged | CI darvoza |
| Testing | Vitest + RTL + Playwright (E2E) | Unit + integration + E2E |
| Deploy | **Vercel** | Next.js uchun nativ |

**Node.js:** `>=20.0.0` (backend bilan bir xil)

---

## 2. Loyiha strukturasi

```
vet-clinic-frontend/
├── public/
│   ├── images/                       # Statik rasmlar (logo, banner)
│   ├── icons/                        # Favicon, manifest icons
│   └── locales/                      # i18n JSON (uz, ru, en)
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth group — markazlangan layout
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/[token]/page.tsx
│   │   │
│   │   ├── (main)/                   # Asosiy layout (Header + Footer)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Bosh sahifa
│   │   │   ├── clinics/
│   │   │   │   ├── page.tsx          # Klinikalar ro'yxati
│   │   │   │   └── [id]/page.tsx     # Klinika tafsiloti
│   │   │   ├── map/page.tsx          # Xarita ko'rinishi
│   │   │   ├── search/page.tsx       # Qidiruv natijalari
│   │   │   ├── profile/
│   │   │   │   ├── page.tsx          # Mening profilim
│   │   │   │   ├── pets/             # Phase 2
│   │   │   │   ├── appointments/     # Phase 2
│   │   │   │   └── favorites/page.tsx
│   │   │   ├── about/page.tsx
│   │   │   └── contact/page.tsx
│   │   │
│   │   ├── admin/                    # Admin panel (RBAC)
│   │   │   ├── layout.tsx            # Sidebar + ADMIN guard
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── clinics/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/edit/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   └── reviews/page.tsx
│   │   │
│   │   ├── layout.tsx                # Root layout (Providers)
│   │   ├── error.tsx                 # Global error boundary
│   │   ├── not-found.tsx             # 404
│   │   ├── loading.tsx               # Global loading UI
│   │   └── globals.css               # Tailwind direktivlari
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn primitives
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx           # Admin
│   │   │   ├── MobileNav.tsx
│   │   │   └── ThemeToggle.tsx
│   │   └── shared/
│   │       ├── ErrorMessage.tsx
│   │       ├── EmptyState.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── ConfirmDialog.tsx
│   │       └── Pagination.tsx
│   │
│   ├── features/                     # Domen modullari (4 fayl pattern)
│   │   ├── auth/
│   │   │   ├── api/auth.api.ts
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── ForgotPasswordForm.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useLogin.ts
│   │   │   │   ├── useRegister.ts
│   │   │   │   ├── useLogout.ts
│   │   │   │   └── useCurrentUser.ts
│   │   │   ├── schemas/auth.schema.ts
│   │   │   ├── store/auth.store.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── clinics/
│   │   │   ├── api/clinics.api.ts
│   │   │   ├── components/
│   │   │   │   ├── ClinicCard.tsx
│   │   │   │   ├── ClinicList.tsx
│   │   │   │   ├── ClinicDetail.tsx
│   │   │   │   ├── ClinicMap.tsx
│   │   │   │   ├── ClinicFilters.tsx
│   │   │   │   ├── OpeningHours.tsx
│   │   │   │   └── ImageGallery.tsx
│   │   │   ├── hooks/
│   │   │   ├── schemas/clinic.schema.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── reviews/
│   │   │   ├── api/reviews.api.ts
│   │   │   ├── components/
│   │   │   │   ├── ReviewList.tsx
│   │   │   │   ├── ReviewCard.tsx
│   │   │   │   ├── ReviewForm.tsx
│   │   │   │   └── RatingStars.tsx
│   │   │   ├── hooks/
│   │   │   ├── schemas/review.schema.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── appointments/             # Phase 2
│   │   ├── pets/                     # Phase 2
│   │   └── admin/
│   │       ├── api/admin.api.ts
│   │       ├── components/
│   │       │   ├── AdminDashboard.tsx
│   │       │   ├── ClinicForm.tsx
│   │       │   ├── OpeningHoursEditor.tsx
│   │       │   ├── UserTable.tsx
│   │       │   └── StatsCards.tsx
│   │       └── hooks/
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts             # Axios + interceptors
│   │   │   ├── endpoints.ts          # URL konstantalar
│   │   │   └── error.ts              # Backend envelope parser
│   │   ├── auth/
│   │   │   ├── token.ts              # Access (memory) + refresh (cookie)
│   │   │   └── jwt.ts                # JWT decode (role, exp)
│   │   ├── utils/
│   │   │   ├── cn.ts                 # tailwind-merge
│   │   │   ├── format.ts             # Sana, telefon, narx
│   │   │   ├── distance.ts           # Haversine
│   │   │   └── opening-hours.ts      # "Hozir ochiq/yopiq"
│   │   └── constants/
│   │       ├── cities.ts             # O'zbekiston shaharlari
│   │       └── routes.ts
│   │
│   ├── hooks/                        # Umumiy hook'lar
│   │   ├── useDebounce.ts
│   │   ├── useGeolocation.ts
│   │   ├── useMediaQuery.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── providers/
│   │   ├── QueryProvider.tsx         # TanStack Query
│   │   ├── ThemeProvider.tsx         # next-themes
│   │   └── ToastProvider.tsx         # sonner
│   │
│   ├── types/
│   │   ├── api.ts                    # Response envelope tiplar
│   │   ├── user.ts
│   │   ├── clinic.ts
│   │   └── review.ts
│   │
│   ├── config/
│   │   ├── env.ts                    # Zod env validatsiya
│   │   └── site.ts                   # Sayt nomi, meta tags
│   │
│   └── middleware.ts                 # Next.js middleware (auth)
│
├── .env.example
├── .env.local                        # gitignored
├── .eslintrc.json
├── .prettierrc
├── .husky/
│   └── pre-commit
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json                     # "strict": true
├── components.json                   # shadcn config
├── package.json
├── README.md
└── CLAUDE.md
```

---

## 3. Hard konvensiyalar

Bu qoidalar **buzilmasligi shart**. Code review'da birinchi navbatda shu qoidalar tekshiriladi.

1. **Response envelope.** Har bir API javobi `{ success, data }` yoki `{ success: false, error: { code, message }, meta: { requestId } }` shaklida. `lib/api/client.ts`'dagi interceptor envelope'ni ochib, faqat `data`'ni qaytaradi. Xato bo'lsa typed `ApiError` throw qiladi.

2. **Validatsiya.** Forma validatsiyasi har doim `features/<modul>/schemas/`'da Zod orqali. Backend xato kodlari (`VALIDATION_ERROR`, `UNAUTHORIZED`, `INVALID_CREDENTIALS`) UI'da O'zbekcha tarjimaga moslashadi.

3. **Server vs Client state.** Server ma'lumotlari (klinikalar, profil, sharhlar) — **TanStack Query**. UI holati (modal ochiq/yopiq, theme, sidebar) — **Zustand** yoki `useState`. Bularni aralashtirmang.

4. **Token saqlash.**
   - Access token — **faqat xotirada** (Zustand store).
   - Refresh token — **httpOnly cookie** (backend o'rnatadi, JS o'qiy olmaydi).
   - `localStorage`'da TOKEN saqlamang (XSS xavfi).

5. **O'zbek tili.** Foydalanuvchi ko'radigan har bir matn (xato xabarlari, tugmalar, tooltip'lar) o'zbekcha. Kod, commit, kommentariya — inglizcha.

6. **Komponent nomlash.**
   - Komponentlar — PascalCase (`ClinicCard.tsx`)
   - Hook'lar — `use` bilan boshlanadi (`useLogin.ts`)
   - Util funksiyalar — camelCase (`formatPhone.ts`)
   - Konstantalar — UPPER_SNAKE_CASE

7. **`'use client'` direktivasi.** Faqat interaktiv komponentlarda. Default — Server Component. Form, button onclick, useState bo'lganda — `'use client'`.

8. **Import tartibi** (ESLint avtomatik tartiblaydi):
   ```
   1. External (react, next, axios)
   2. Internal absolute (@/components, @/features)
   3. Relative (./Button, ../utils)
   4. Type imports (oxirida)
   ```

9. **Hech qachon `any` ishlatmang.** `unknown` + type guard yoki to'liq tip yozing.

10. **Har bir async operatsiya** — loading + error + empty state'larini boshqaradi. "Happy path" yetarli emas.

---

## 4. Backend ↔ Frontend endpoint mapping

| Backend route | Method | Frontend feature | Mas'ul |
|---|---|---|---|
| `/api/v1/auth/register` | POST | `features/auth` | Suhrob |
| `/api/v1/auth/login` | POST | `features/auth` | Suhrob |
| `/api/v1/auth/refresh` | POST | `lib/api/client.ts` interceptor | Sunnatbek |
| `/api/v1/auth/logout` | POST | `features/auth` | Suhrob |
| `/api/v1/auth/me` | GET | `features/auth` | Suhrob |
| `/api/v1/clinics` | GET | `features/clinics` | Doniyor |
| `/api/v1/clinics/:id` | GET | `features/clinics` | Doniyor |
| `/api/v1/clinics/nearby` | GET | `features/clinics` (Map) | Doniyor |
| `/api/v1/clinics/:id/reviews` | GET, POST | `features/reviews` | Akbar |
| `/api/v1/reviews/:id` | PATCH, DELETE | `features/reviews` | Akbar |
| `/api/v1/admin/clinics` | POST, PATCH, DELETE | `features/admin` | Hayot |
| `/api/v1/admin/users` | GET, PATCH | `features/admin` | Hayot |
| `/api/v1/health` | GET | DevOps monitoring | Sunnatbek |

**Swagger:** `http://localhost:4000/docs` — har bir endpoint to'liq tasvirlangan.

---

## 5. Komanda vazifalari

---

### Sunnatbek (Tech Lead / Architect)

**Mas'uliyat sohasi:** Loyiha poydevori, infratuzilma, kod sifati, code review.

**Vazifalar:**

| # | Vazifa | Fayl/Joy |
|---|---|---|
| 1 | Loyihani `create-next-app --typescript` bilan boshlash | root |
| 2 | Tailwind v4 + shadcn/ui sozlash | `components.json`, `tailwind.config.ts` |
| 3 | ESLint + Prettier + Husky + lint-staged | `.eslintrc.json`, `.husky/` |
| 4 | Axios instance + access/refresh interceptor | `src/lib/api/client.ts` |
| 5 | Backend envelope ni typed exception'ga aylantirish | `src/lib/api/error.ts` |
| 6 | Env validatsiya (Zod) | `src/config/env.ts` |
| 7 | TanStack Query setup (defaultOptions, devtools) | `src/providers/QueryProvider.tsx` |
| 8 | Next middleware — `/admin`, `/profile` JWT tekshiruvi | `src/middleware.ts` |
| 9 | Root layout — barcha provider'lar wiring | `src/app/layout.tsx` |
| 10 | Global error/404/loading sahifalar | `src/app/error.tsx`, `not-found.tsx` |
| 11 | GitHub Actions CI: typecheck → lint → test → build | `.github/workflows/ci.yml` |
| 12 | Vercel deploy + preview branch'lar | Vercel dashboard |
| 13 | `README.md` va `CLAUDE.md` yozish | root |
| 14 | **Code review** har bir PR'da | GitHub |

**Deadline:** 1-hafta (loyiha poydevori), keyin doimiy code review.

**Definition of Done:** Hamma a'zolar `npm run dev` qilib, login + clinics ro'yxatini ko'ra olishi.

---

### Yahyo (UI/UX Engineer)

**Mas'uliyat sohasi:** Dizayn tizimi, layout, qayta ishlatiluvchi komponentlar.

**Vazifalar:**

| # | Vazifa | Fayl/Joy |
|---|---|---|
| 1 | shadcn/ui komponentlar: button, input, card, dialog, dropdown-menu, sheet, tabs, toast, select, form, skeleton, badge, avatar | `src/components/ui/` |
| 2 | Light/dark tema (`next-themes`) | `src/providers/ThemeProvider.tsx` |
| 3 | Brend ranglari (CSS variables) | `tailwind.config.ts`, `globals.css` |
| 4 | `Header.tsx` — logo, navigatsiya, profil/login | `src/components/layout/Header.tsx` |
| 5 | `Footer.tsx` — kontakt, social, copyright | `src/components/layout/Footer.tsx` |
| 6 | `MobileNav.tsx` — hamburger + drawer | `src/components/layout/MobileNav.tsx` |
| 7 | `ThemeToggle.tsx` | `src/components/layout/ThemeToggle.tsx` |
| 8 | `EmptyState.tsx` — bo'sh holat illustratsiya | `src/components/shared/EmptyState.tsx` |
| 9 | `LoadingSpinner.tsx`, Skeleton variantlar | `src/components/shared/` |
| 10 | `ConfirmDialog.tsx` — qayta ishlatiluvchi | `src/components/shared/ConfirmDialog.tsx` |
| 11 | **Bosh sahifa** — Hero, Top klinikalar, Shaharlar | `src/app/(main)/page.tsx` |
| 12 | About + Contact sahifalari | `src/app/(main)/about/`, `contact/` |
| 13 | Mobile-first responsive | barcha layout |
| 14 | A11y audit — keyboard, aria-label, alt | barcha komponentlar |

**Deadline:** 2-hafta.

**Definition of Done:** Lighthouse Accessibility score ≥95.

---

### Suhrob (Authentication Engineer)

**Mas'uliyat sohasi:** Foydalanuvchi autentifikatsiyasi, session boshqaruvi, RBAC.

**Vazifalar:**

| # | Vazifa | Fayl/Joy |
|---|---|---|
| 1 | Zod schema'lar — login, register, password | `src/features/auth/schemas/auth.schema.ts` |
| 2 | API qatlami — register, login, logout, me | `src/features/auth/api/auth.api.ts` |
| 3 | Zustand store — user, accessToken, setAuth, clearAuth | `src/features/auth/store/auth.store.ts` |
| 4 | Hook'lar — useLogin, useRegister, useLogout | `src/features/auth/hooks/` |
| 5 | `useCurrentUser` — JWT decode yoki `/auth/me` | `src/features/auth/hooks/useCurrentUser.ts` |
| 6 | `LoginForm` — RHF + Zod, error handling | `src/features/auth/components/LoginForm.tsx` |
| 7 | `RegisterForm` — parol kuchi indikatori | `src/features/auth/components/RegisterForm.tsx` |
| 8 | `ForgotPasswordForm` (Phase 2 — backend tayyor bo'lganda) | `src/features/auth/components/ForgotPasswordForm.tsx` |
| 9 | Auth layout — markazlangan card | `src/app/(auth)/layout.tsx` |
| 10 | Login/Register sahifalar | `src/app/(auth)/login/`, `register/` |
| 11 | `useRequireAuth()` hook — protected route | `src/features/auth/hooks/useRequireAuth.ts` |
| 12 | Backend xato kodlarini O'zbekchaga tarjima | `src/lib/api/error.ts` (lookup table) |
| 13 | "Logout" — barcha React Query cache tozalash | `src/features/auth/hooks/useLogout.ts` |

**Deadline:** 2-hafta.

**Definition of Done:** Login → home redirect, refresh token avtomatik yangilanadi, logout to'liq cache'ni tozalaydi.

---

### Doniyor (Clinics & Map Engineer)

**Mas'uliyat sohasi:** Klinikalar listingi, tafsilot, qidiruv, xarita integratsiyasi.

**Vazifalar:**

| # | Vazifa | Fayl/Joy |
|---|---|---|
| 1 | TypeScript tiplar (Clinic, OpeningHours) — backend schema'ga mos | `src/features/clinics/types.ts` |
| 2 | API qatlami — list, getById, nearby | `src/features/clinics/api/clinics.api.ts` |
| 3 | Hook'lar — useClinics, useClinic, useNearbyClinics | `src/features/clinics/hooks/` |
| 4 | `ClinicCard` — rasm, nom, manzil, reyting, "ochiq" badge | `src/features/clinics/components/ClinicCard.tsx` |
| 5 | `ClinicList` — grid + sahifalash | `src/features/clinics/components/ClinicList.tsx` |
| 6 | `ClinicFilters` — shahar, ochiq, reyting | `src/features/clinics/components/ClinicFilters.tsx` |
| 7 | `ClinicDetail` — tabs (Ma'lumot/Sharhlar/Joylashuv) | `src/features/clinics/components/ClinicDetail.tsx` |
| 8 | `OpeningHours` — backend JSON → jadval + "Hozir ochiqmi" | `src/features/clinics/components/OpeningHours.tsx` |
| 9 | `opening-hours.ts` util — vaqt mantiqi | `src/lib/utils/opening-hours.ts` |
| 10 | `ClinicMap` — Leaflet, marker, popup | `src/features/clinics/components/ClinicMap.tsx` |
| 11 | `ImageGallery` — lightbox | `src/features/clinics/components/ImageGallery.tsx` |
| 12 | Klinikalar ro'yxati sahifasi | `src/app/(main)/clinics/page.tsx` |
| 13 | Klinika tafsilot sahifasi (SSR + `generateMetadata`) | `src/app/(main)/clinics/[id]/page.tsx` |
| 14 | Xarita sahifasi (full-screen + sidebar) | `src/app/(main)/map/page.tsx` |
| 15 | Qidiruv (debounced) | `src/app/(main)/search/page.tsx` |
| 16 | `useGeolocation` hook — yaqin klinikalar | `src/hooks/useGeolocation.ts` |

**Deadline:** 3-hafta.

**Definition of Done:** Klinika sahifasi SEO-friendly (meta tags), xarita 60fps'da ishlaydi, geolokatsiya graceful fallback.

---

### Akbar (User Profile & Reviews Engineer)

**Mas'uliyat sohasi:** Foydalanuvchi profili, sharhlar, sevimlilar (kelajakda — pets, appointments).

**Vazifalar:**

| # | Vazifa | Fayl/Joy |
|---|---|---|
| 1 | Profil sahifasi — ma'lumot, parol o'zgartirish | `src/app/(main)/profile/page.tsx` |
| 2 | Sevimlilar sahifasi (MVP: localStorage, Phase 2: backend) | `src/app/(main)/profile/favorites/page.tsx` |
| 3 | API qatlami — create, update, delete, listByClinic | `src/features/reviews/api/reviews.api.ts` |
| 4 | Zod schema — rating 1–5, comment max 500 | `src/features/reviews/schemas/review.schema.ts` |
| 5 | `ReviewForm` — RHF + Zod, optimistic submit | `src/features/reviews/components/ReviewForm.tsx` |
| 6 | `ReviewCard` — yulduzlar, ism, sana, edit/delete (o'ziniki bo'lsa) | `src/features/reviews/components/ReviewCard.tsx` |
| 7 | `ReviewList` — sahifalash + sort (yangi/eski/reyting) | `src/features/reviews/components/ReviewList.tsx` |
| 8 | `RatingStars` — interaktiv (input) + statik (display) | `src/features/reviews/components/RatingStars.tsx` |
| 9 | Hook'lar — useReviews, useCreateReview, useUpdateReview, useDeleteReview | `src/features/reviews/hooks/` |
| 10 | **Optimistic update** — sharh qo'shilganda darhol UI'da ko'rinishi | `useCreateReview` |
| 11 | Klinika sahifasi "Sharhlar" tab'iga integratsiya (Doniyor bilan) | `ClinicDetail.tsx` |
| 12 | **Phase 2:** `features/pets/` — Pet CRUD (nom, tur, sana, rasm) | yangi feature |
| 13 | **Phase 2:** `features/appointments/` — uchrashuv yaratish | yangi feature |

**Deadline:** 3-hafta.

**Definition of Done:** Sharh yuborish < 500ms (optimistic), o'z sharhini tahrirlash/o'chirish ishlaydi, boshqaning sharhini o'zgartira olmaydi.

---

### Hayot (Admin Panel Engineer)

**Mas'uliyat sohasi:** Admin panel — RBAC, CRUD, dashboard, moderatsiya.

**Vazifalar:**

| # | Vazifa | Fayl/Joy |
|---|---|---|
| 1 | Admin layout — Sidebar + RBAC guard (`role !== 'ADMIN'` → 403) | `src/app/admin/layout.tsx` |
| 2 | `AdminSidebar` — Dashboard / Klinikalar / Foydalanuvchilar / Sharhlar | `src/features/admin/components/AdminSidebar.tsx` |
| 3 | **Dashboard** — `StatsCards` (jami klinikalar, foydalanuvchilar, sharhlar 7 kun, top-5 reyting) | `src/app/admin/page.tsx` |
| 4 | Klinikalar ro'yxati — DataTable (search, sort, filter, pagination) | `src/app/admin/clinics/page.tsx` |
| 5 | Klinika yaratish formasi | `src/app/admin/clinics/new/page.tsx` |
| 6 | Klinika tahrirlash | `src/app/admin/clinics/[id]/edit/page.tsx` |
| 7 | `ClinicForm` — Zod (backend `clinicCreateSchema` bilan bir xil) | `src/features/admin/components/ClinicForm.tsx` |
| 8 | `OpeningHoursEditor` — 7 kun + soatlar | `src/features/admin/components/OpeningHoursEditor.tsx` |
| 9 | Xarita orqali koordinata tanlash (Doniyor'ning Map'idan) | `ClinicForm.tsx` |
| 10 | Foydalanuvchilar — ro'yxat, role o'zgartirish, bloklash | `src/app/admin/users/page.tsx` |
| 11 | Sharhlar moderatsiyasi — o'chirish, spam | `src/app/admin/reviews/page.tsx` |
| 12 | `ConfirmDialog` har bir destruktiv amalda | barcha admin sahifalar |
| 13 | CSV eksport tugmasi (klinikalar, foydalanuvchilar) | `src/features/admin/components/ExportButton.tsx` |
| 14 | Toast bildirishnomalar (`sonner`) — har bir muvaffaqiyat/xato | barcha amallar |

**Deadline:** 4-hafta.

**Definition of Done:** Non-admin foydalanuvchi `/admin` ga kira olmaydi, barcha CRUD ishlaydi, har bir o'chirish tasdiq so'raydi.

---

## 6. Git workflow

### Branch nomlash

| Tur | Format | Misol |
|---|---|---|
| Production | `main` | `main` (himoyalangan) |
| Staging | `develop` | `develop` |
| Feature | `feature/<ism>-<tavsif>` | `feature/suhrob-login-form` |
| Bug fix | `fix/<tavsif>` | `fix/clinic-detail-404` |
| Chore | `chore/<tavsif>` | `chore/update-deps` |
| Hotfix | `hotfix/<tavsif>` | `hotfix/auth-refresh-loop` |

### Commit qoidalari (Conventional Commits)

```
feat(auth): add login form with Zod validation
fix(clinics): handle empty openingHours response
chore: bump next to 15.2
docs: update README setup steps
refactor(api): extract envelope parser to lib
test(reviews): add ReviewForm submit test
style: format with prettier
```

**Tip:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`.

### PR qoidalari

1. Har bir feature **alohida branch'da**.
2. PR'da **rasm/screenshot/GIF** (UI o'zgarishi bo'lsa).
3. **Kamida 1 reviewer** — Sunnatbek + bitta jamoa a'zosi.
4. **CI yashil bo'lishi shart** — typecheck + lint + build.
5. Merge strategiyasi: **Squash and merge**.
6. Branch ochildi → 3 kun ichida merge yoki yopilishi kerak (uzoq branch'lar = merge conflict).

### PR description shabloni

```markdown
## Nima qilindi
- ...

## Qanday tekshirish kerak
1. `npm run dev`
2. ...

## Screenshot / GIF
(rasm)

## Backend o'zgarishi kerakmi?
- [ ] Yo'q
- [ ] Ha — qanday: ...

## Checklist
- [ ] TypeScript xato yo'q
- [ ] ESLint warning yo'q
- [ ] Mobile + desktop'da test qilindi
- [ ] Loading/error/empty state'lar ishlanadi
```

### Daily standup

Telegram guruhida har kuni **09:00** — 3 ta savol:
1. Kecha nima qildim?
2. Bugun nima qilaman?
3. Blocker bormi?

---

## 7. Setup va ishga tushirish

```bash
# 1. Loyihani klonlash
git clone <repo-url>
cd vet-clinic-frontend

# 2. Dependencies
npm install

# 3. Env fayl
cp .env.example .env.local
# .env.local'ni to'ldirish:
# NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# 4. Backend ishga tushirilganligini tekshirish (port 4000)
curl http://localhost:4000/api/v1/health

# 5. Dev server
npm run dev          # http://localhost:3000

# 6. Build va sifat tekshiruvi
npm run build
npm run typecheck
npm run lint
npm run format

# 7. Test
npm run test         # Vitest (unit + integration)
npm run test:e2e     # Playwright (E2E)

# 8. shadcn/ui komponent qo'shish
npx shadcn@latest add button
npx shadcn@latest add dialog
```

### `.env.example`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

---

## 8. Sprint roadmap

### Sprint 1 (1-hafta) — Poydevor
- **Sunnatbek:** loyiha setup, CI/CD, API client, middleware, providers
- **Yahyo:** shadcn setup, Header, Footer, tema
- **Boshqalar:** repo'ni o'rganish, backend Swagger'ni o'qish

**Demo:** `npm run dev` ishlaydi, login sahifa mock data bilan ochiladi.

---

### Sprint 2 (2-hafta) — Auth + UI library
- **Suhrob:** to'liq auth flow (login, register, logout, refresh)
- **Yahyo:** bosh sahifa, shared komponentlar, mobile nav
- **Doniyor:** ClinicCard, ClinicList (mock data)
- **Akbar:** profil sahifasi skeleton
- **Hayot:** admin layout + RBAC guard

**Demo:** Foydalanuvchi register → login → bosh sahifa ko'rishi.

---

### Sprint 3 (3-hafta) — Asosiy biznes
- **Doniyor:** klinika tafsilot + xarita + qidiruv
- **Akbar:** sharhlar tizimi (CRUD + optimistic)
- **Hayot:** admin Klinikalar CRUD
- **Yahyo:** About, Contact, polish

**Demo:** To'liq foydalanuvchi flow'i — ro'yxat → tafsilot → sharh qoldirish.

---

### Sprint 4 (4-hafta) — Admin + polish
- **Hayot:** Dashboard, Foydalanuvchilar, Sharhlar moderatsiya
- **Hammasi:** bug fix, accessibility, performance audit
- **Sunnatbek:** Lighthouse audit, bundle size optimizatsiya

**Demo:** Admin to'liq klinika qo'shadi, foydalanuvchini bloklaydi.

---

### Sprint 5 (5-hafta) — QA + Deploy
- **Hammasi:** E2E testlar (Playwright) — auth, clinic flow, admin
- **Sunnatbek:** Vercel production deploy + custom domain
- **Hayot + Akbar:** smoke test backend bilan
- **Yahyo:** final UI polish

**Demo:** Production URL'da to'liq ishlaydigan MVP.

---

## 9. Definition of Done

Har bir feature production'ga chiqishi uchun quyidagilarga javob berishi kerak:

- [ ] TypeScript xatolari yo'q (`npm run typecheck`)
- [ ] ESLint warning'lari yo'q (`npm run lint`)
- [ ] Prettier formatlangan (`npm run format`)
- [ ] Mobile (375px) + tablet (768px) + desktop (1280px)'da test qilingan
- [ ] Loading state ishlanadi
- [ ] Error state ishlanadi (network xato, 4xx, 5xx)
- [ ] Empty state ishlanadi (bo'sh ro'yxat, qidiruv natija yo'q)
- [ ] Backend bilan **haqiqiy integratsiya** tekshirilgan (mock emas)
- [ ] Accessibility — keyboard navigation, alt text, aria-label
- [ ] Lighthouse Performance ≥85, Accessibility ≥95
- [ ] PR review'dan o'tgan
- [ ] Conventional commit message
- [ ] Documentation yangilangan (kerak bo'lsa)

---

## 10. Resurslar

### Rasmiy hujjatlar
- [Next.js 15 docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [TanStack Query v5](https://tanstack.com/query/latest)
- [Zod](https://zod.dev)
- [React Hook Form](https://react-hook-form.com)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Leaflet](https://leafletjs.com) + [react-leaflet](https://react-leaflet.js.org)
- [Zustand](https://zustand-demo.pmnd.rs)

### Loyiha resurslari
- **Backend Swagger:** `http://localhost:4000/docs`
- **Backend repo:** (link)
- **Figma dizayn:** (link — Yahyo joylaydi)
- **Telegram guruh:** (link)

### Yordam
- **Texnik savollar:** Sunnatbek (Tech Lead)
- **Dizayn savollar:** Yahyo
- **Backend API savollar:** Sunnatbek yoki Swagger

---

## Yakuniy eslatma

Ushbu hujjat **tirik** — komanda ishi davomida yangilanadi. Har qanday o'zgartirish PR orqali, kamida 1 reviewer bilan. Loyihaning muvaffaqiyati har bir a'zoning intizomli ishi va o'zaro hurmatga bog'liq.

**Omad!**
