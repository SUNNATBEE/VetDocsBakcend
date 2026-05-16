# Frontend Architecture (Professional Blueprint)

## 1) Maqsad

Vet Clinic frontend quyidagi 4 maqsadga xizmat qiladi:

- tez va aniq klinika qidiruvi
- ishonchli auth flow (access/refresh)
- admin panelda xavfsiz CRUD boshqaruvi
- production uchun testable va maintainable codebase

## 2) Texnologik stack

- Framework: `Next.js 15` (App Router)
- Til: `TypeScript` (`strict: true`)
- UI: `Tailwind CSS v4` + `shadcn/ui`
- Server state: `TanStack Query v5`
- Client state: `Zustand`
- Forms: `React Hook Form` + `Zod`
- Mapping: `Leaflet` + `react-leaflet`
- Testing: `Vitest` + `RTL` + `Playwright`
- Deploy: `Vercel`

## 3) Arxitektura tamoyillari

1. **Feature-first design**
   - `src/features/<domain>/...`
   - Har modulda `api`, `hooks`, `schemas`, `components`, `types`.
2. **Thin page layer**
   - `app/*/page.tsx` faqat composition qiladi.
   - Biznes mantiq `features/*` ichida bo'ladi.
3. **Single API gateway**
   - Barcha HTTP chaqiriqlar `src/lib/api/client.ts` orqali.
4. **Typed boundaries**
   - `any` yo'q.
   - API response va form schema aniq typed bo'ladi.
5. **Predictable state ownership**
   - Server data -> Query cache.
   - UI state -> local state/Zustand.

## 4) Tavsiya etilgan papka modeli

```txt
src/
  app/
    (auth)/
    (main)/
    admin/
  features/
    auth/
    clinics/
    reviews/
    admin/
  lib/
    api/
    auth/
    utils/
  providers/
  components/
```

## 5) Qatlamlar bo'yicha javobgarlik

- `app/*`: routing, layout, metadata
- `features/*/api`: endpoint wrapper
- `features/*/hooks`: query/mutation hooks
- `features/*/components`: UI + UX states
- `lib/api/*`: base client, interceptors, error parser
- `providers/*`: global context

## 6) Render strategiyasi

- Klinikalar ro'yxati: SSR + client enhancements
- Klinikalar detail: SSR + cache revalidate
- Admin: auth-gated client routes
- Search/map: client-side interactive render

## 7) UX quality checklist

- Har sahifada `loading`, `error`, `empty` holatlari bor
- Formlarda inline validation messages bor
- Muhim actionlarda confirm dialog bor
- Delete operatsiyalarida undo yoki clear warning bor
- Mobile (375px) uchun responsive first

## 8) Security checklist

- Access token faqat memory'da
- Refresh flow interceptor orqali markazlashgan
- `Authorization` header faqat protected endpointlarda
- Admin route guard (`role === ADMIN`) majburiy
- Xatolarni foydalanuvchiga normalize qilib ko'rsatish

## 9) Performance checklist

- Query stale-time va gc-time oqilona sozlangan
- List virtualization (yirik ro'yxatlarda)
- Image lazy loading
- Dynamic imports (og'ir admin komponentlarda)
- Lighthouse Performance 85+ target

## 10) Maintanability checklist

- Har feature uchun docs + examples
- Qayta ishlatiladigan UI components shared papkada
- Hard-coded stringlar constants/i18n qatlamida
- Feature-level tests mavjud
