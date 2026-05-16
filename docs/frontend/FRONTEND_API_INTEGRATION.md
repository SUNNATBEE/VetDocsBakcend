# Frontend API Integration Guide

## 1) API base contract

Backend base URL:

- local: `http://localhost:4000/api/v1`
- prod: `<your-backend-url>/api/v1`

Javob formati:

- success: `{ success: true, data: ... }`
- error: `{ success: false, error: { code, message, details? }, meta: { requestId } }`

Frontend qoidasi: componentlar raw `fetch` ishlatmaydi, faqat `api client` ishlatadi.

## 2) API client standarti

`src/lib/api/client.ts` quyidagilarni bajaradi:

- base URL ulash
- JSON serialize/deserialize
- `Authorization` header injektsiya
- `TOKEN_EXPIRED`da refresh va retry
- API xatolarini `ApiError` ga normalize qilish

## 3) Token flow

1. `login/register` -> `accessToken` + `refreshToken`
2. `accessToken` memory store'ga yoziladi
3. `401 TOKEN_EXPIRED` bo'lsa:
   - `/auth/refresh` chaqiriladi
   - yangi access token olinadi
   - original request 1 marta retry qilinadi
4. `refresh` muvaffaqiyatsiz bo'lsa:
   - auth state clear
   - login screen'ga redirect

## 4) Endpoint ownership

### Public

- `GET /health`
- `GET /clinics/nearby` — `lat`/`lng`/`address`/`district` rejimlari; default `radiusKm=10`
- `GET /clinics/districts` — Toshkent tumanlari katalogi (dropdown uchun)
- `GET /clinics/:id`
- `GET /config/public` — `googleMapsBrowserKey` (xarita SPA uchun)

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### Protected (USER+)

- `POST /clinics/:id/reviews`

### Protected (ADMIN)

- `/admin/dashboard`
- `/admin/clinics*`
- `/admin/reviews*`
- `/admin/users*`

## 5) Query key standard (TanStack Query)

Tavsiya etilgan query-key naming:

- `['health']`
- `['clinics', 'nearby', { lat, lng, radiusKm, district }]`
- `['clinics', 'districts']` — stable, kamdan-kam o'zgaradi (server `Cache-Control: public, max-age=300`)
- `['clinics', 'detail', clinicId]`
- `['reviews', 'clinic', clinicId]`
- `['config', 'public']`
- `['admin', 'dashboard']`
- `['admin', 'clinics', { page, pageSize, q }]`
- `['admin', 'users', { page, pageSize, q }]`

## 6) Mutation invalidation qoidasi

- review qo'shilsa:
  - `['clinics', 'detail', clinicId]`
  - `['clinics', 'nearby', ...]` (agar rating ko'rinayotgan bo'lsa)
- clinic update/delete bo'lsa:
  - admin ro'yxat query'lari
  - public clinics query'lari
- user role update bo'lsa:
  - admin users list

## 7) Error handling strategy

`error.code` bo'yicha UI message map:

- `VALIDATION_ERROR` -> "Kiritilgan ma'lumotni tekshiring"
- `UNAUTHORIZED` / `INVALID_TOKEN` -> "Qayta tizimga kiring"
- `FORBIDDEN` -> "Bu amal uchun ruxsat yo'q"
- `CLINIC_NOT_FOUND` -> "Klinika topilmadi"
- `RATE_LIMIT` -> "Juda ko'p urinish. Keyinroq urinib ko'ring"
- default -> backend `message` yoki generic fallback

## 8) Example service signatures (TS)

```ts
type NearbyInput =
  | { lat: number; lng: number; radiusKm?: number; district?: District }
  | { address: string; radiusKm?: number; district?: District }
  | { district: District; radiusKm?: number };          // markaz tuman markazi

getNearbyClinics(input: NearbyInput): Promise<{
  clinics: ClinicSummary[];
  searchCenter?: { lat: number; lng: number; query?: string; district?: District | null };
}>
listDistricts(): Promise<{ districts: Array<{ key: District; name: string; lat: number; lng: number; clinicCount: number }> }>
getPublicConfig(): Promise<{ googleMapsBrowserKey: string | null }>
getClinicDetail(id: string): Promise<ClinicDetail>
createReview(input: { clinicId: string; rating: number; comment?: string }): Promise<Review>
login(input: { email: string; password: string }): Promise<AuthPayload>
```

> `District` — `'Bektemir' | 'Chilonzor' | 'Mirobod' | 'Mirzo Ulug‘bek' | 'Olmazor' | 'Sergeli' | 'Shayxontohur' | 'Uchtepa' | 'Yakkasaroy' | 'Yangi Hayot' | 'Yashnobod' | 'Yunusobod'`. Hech qachon hardcode qilmang — `/clinics/districts` dan dynamicallt yuklang (admin yangi tuman qo'shsa, frontend qayta deploy qilinmasin).

## 9) QA API checklist

- Authsiz endpointlar token so'ramaydi
- Protected endpointlar token bo'lmasa 401 beradi
- Expired token flow auto-refresh bilan ishlaydi
- Error toastlarda `requestId` logga yoziladi
- Swagger examples frontendda to'g'ri parse bo'ladi
