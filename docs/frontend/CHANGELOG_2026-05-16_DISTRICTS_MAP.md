# Frontend Changelog — 2026-05-16

> Toshkent tumanlari + public xarita sahifasi qo'shildi. Bu hujjat frontend
> jamoasi uchun: nima o'zgardi, mavjud kod nima qilishi kerak, qanday
> migratsiya rejasi tutiladi.

---

## TL;DR

1. **Yangi endpoint:** `GET /api/v1/clinics/districts` — Toshkent tumanlari dropdowni.
2. **Yangi endpoint:** `GET /api/v1/config/public` — brauzer uchun ochiq konfiguratsiya (hozircha Google Maps kaliti).
3. **`GET /api/v1/clinics/nearby`** endi 4 ta rejimda chaqiriladi: koordinata, manzil, tuman, yoki kombinatsiya.
4. **Response DTO'larida `district` maydoni** — `ClinicSummary`, `ClinicDetail`, `AdminClinic` larga qo'shildi (Toshkent uchun string, boshqa shaharlar uchun `null`).
5. **Reference UI:** `/map` sahifasi (vanilla JS, build step yo'q) — sizning frontendingiz uchun namuna sifatida `public/map/app.js` ga qarang.

Backward compatibility: **buzilmagan**. Eski `?lat&lng` chaqiruvi avvalgidek ishlaydi, response'da yangi `district` maydoni `null` yoki string bo'lib qo'shilgan — qabul qiluvchilar uni e'tiborsiz qoldirsa hech narsa buzilmaydi.

---

## 1) Yangi: `GET /clinics/districts`

Toshkent tumanlari katalogi. Birinchi navbatda dropdown'ni to'ldirish uchun.

**Query:** parametr yo'q.

**Response:**

```json
{
  "success": true,
  "data": {
    "districts": [
      { "key": "Bektemir",     "name": "Bektemir",     "lat": 41.226, "lng": 69.339, "clinicCount": 5 },
      { "key": "Chilonzor",    "name": "Chilonzor",    "lat": 41.275, "lng": 69.205, "clinicCount": 5 },
      { "key": "Mirobod",      "name": "Mirobod",      "lat": 41.295, "lng": 69.282, "clinicCount": 5 },
      { "key": "Mirzo Ulug‘bek","name": "Mirzo Ulug‘bek","lat":41.325,"lng":69.336,"clinicCount":5 },
      { "key": "Olmazor",      "name": "Olmazor",      "lat": 41.347, "lng": 69.226, "clinicCount": 5 },
      { "key": "Sergeli",      "name": "Sergeli",      "lat": 41.230, "lng": 69.219, "clinicCount": 5 },
      { "key": "Shayxontohur", "name": "Shayxontohur", "lat": 41.325, "lng": 69.236, "clinicCount": 5 },
      { "key": "Uchtepa",      "name": "Uchtepa",      "lat": 41.288, "lng": 69.184, "clinicCount": 5 },
      { "key": "Yakkasaroy",   "name": "Yakkasaroy",   "lat": 41.286, "lng": 69.252, "clinicCount": 5 },
      { "key": "Yangi Hayot",  "name": "Yangi Hayot",  "lat": 41.196, "lng": 69.255, "clinicCount": 5 },
      { "key": "Yashnobod",    "name": "Yashnobod",    "lat": 41.295, "lng": 69.330, "clinicCount": 5 },
      { "key": "Yunusobod",    "name": "Yunusobod",    "lat": 41.367, "lng": 69.291, "clinicCount": 5 }
    ]
  }
}
```

**Maydonlar:**

| Maydon | Tushuntirish |
|---|---|
| `key` | DB'da saqlanadigan kanonik kalit. `/clinics/nearby?district=...` ga **shu** qiymat yuboriladi. |
| `name` | UI'da ko'rsatish uchun nom (diakritikalar bilan — `Mirzo Ulug‘bek`). |
| `lat` / `lng` | Tuman markazi koordinatalari. `lat`/`lng`siz tuman bo'yicha qidirsangiz, server shu nuqtadan boshlaydi. |
| `clinicCount` | Hozir DB'da shu tumanga biriktirilgan klinika soni. Dropdown'da qavs ichida ko'rsatish mumkin: `Chilonzor (5)`. |

**Keshlash:**

- Server javobida `Cache-Control: public, max-age=300` — 5 daqiqa keshlanadi.
- Frontend TanStack Query bilan: `staleTime: 5 * 60_000`, `gcTime: 60 * 60_000`. Tumanlar deyarli o'zgarmaydi.

**Qoidalar:**

- ❌ Tumanlar ro'yxatini frontend kodida **hardcode qilmang**. Admin yangi tuman qo'shsa, sizning ilovangiz qayta deploy talab qilmasin.
- ✅ App boot bo'lganda bir marta chaqiring va dropdownlarga ulang.

---

## 2) Yangi: `GET /config/public`

Brauzer uchun **xavfsiz** konfiguratsiya. Hozircha bitta maydon — Google Maps kaliti.

**Response:**

```json
{
  "success": true,
  "data": {
    "googleMapsBrowserKey": "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }
}
```

Kalit sozlanmagan bo'lsa `googleMapsBrowserKey: null` qaytadi — bu holda xaritani yuklamasdan faqat ro'yxatli ko'rinishni ko'rsating.

**Nima uchun shunday qildik:**

- Google Maps kalit ishlab chiqarish (production) frontend buildga yashirilmaydi — `.env` ga qo'yib bo'lmaydi, chunki next.js public env ham public bo'lib qoladi.
- Kalit baribir public (HTTP referrer cheklov bilan himoyalanadi), lekin **server endpointidan o'qish** — rotation osonroq (frontend deploy talab qilmaydi).

**Keshlash:** `Cache-Control: public, max-age=60` (1 daqiqa). Frontend cheksiz keshlamasin — kalit rotate qilinishi mumkin.

---

## 3) O'zgargan: `GET /clinics/nearby` — 4 ta rejim

`district` query parametri qo'shildi. Endi 4 ta to'g'ri chaqiruv shakli bor:

| Rejim | Query | Qaytaradi |
|---|---|---|
| Koordinata | `?lat=41.31&lng=69.25&radiusKm=5` | Avvalgidek |
| Manzil | `?address=Chilonzor&radiusKm=5` | `searchCenter: { lat, lng, query }` ham keladi |
| Tuman markazi | `?district=Chilonzor&radiusKm=5` | Markaz tuman markazidan olinadi, faqat shu tumandagi klinikalar |
| Koordinata + tuman filter | `?lat=41.31&lng=69.25&radiusKm=5&district=Chilonzor` | Sizning nuqtangiz atrofidagi va aynan Chilonzor klinikalar |

**Validatsiya qoidalari (server tarafida):**

- `address` berilsa, `lat`/`lng` bo'lmasligi kerak (mutually exclusive).
- `district` ham, `lat`/`lng` ham bo'lmasa — `lat`/`lng` majburiy bo'ladi.
- `district` faqat ro'yxatdagi 12 ta kalitdan biri (boshqa qiymat 400 `VALIDATION_ERROR`).
- `radiusKm` default `10`, maksimum `200`.

**Response:**

```json
{
  "success": true,
  "data": {
    "clinics": [
      {
        "id": "clu1xv8z00000abcd1234efgh",
        "name": "Vet Service — Chilonzor",
        "phone": "+998 71 200 10 02",
        "address": "Chilonzor tumani, ko'cha 2-uy, Toshkent",
        "city": "Toshkent",
        "district": "Chilonzor",
        "latitude": 41.281,
        "longitude": 69.209,
        "distanceKm": 0.74,
        "isOpenNow": true,
        "todayHours": { "open": "09:00", "close": "19:00" },
        "averageRating": null,
        "reviewCount": 0
      }
    ],
    "searchCenter": {
      "lat": 41.275,
      "lng": 69.205,
      "query": null,
      "district": "Chilonzor"
    }
  }
}
```

**Yangi maydon:** har bir `ClinicSummary.district: string | null`. Toshkent klinikalari uchun string, boshqa shahar uchun `null`.

**`searchCenter` qachon keladi:**

- Manzil rejimi (`address`): `{ lat, lng, query, district? }`.
- Tuman rejimi (`district`): `{ lat, lng, district }` — `lat`/`lng` tuman markazi.
- Koordinata rejimi: `{ lat, lng, district? }` — siz yuborgan nuqta qaytariladi.

Xaritani markazlash uchun shu nuqtani ishlatishingiz mumkin.

---

## 4) DTO o'zgarishlari

`district: string | null` qo'shildi quyidagilarga:

- `ClinicSummary` (`/clinics/nearby`)
- `ClinicDetail` (`/clinics/:id`)
- `AdminClinic` (`/admin/clinics*` — read response'lar)

**Admin create/update:** hozircha `district` ni admin payloadda qabul qilmaydi (faqat seed yoki direct DB update orqali to'ldiriladi). Agar admin SPA orqali tuman tanlash kerak bo'lsa, alohida ticket ochib qo'shamiz.

---

## 5) Eski kod nima qilishi kerak

| Holat | Harakat |
|---|---|
| Sizda `lat/lng + radius` bilan nearby chaqiruv bor | **Hech nima qilmang** — avvalgidek ishlaydi. |
| `clinic.district` ni terish/sort qilish kerak bo'lsa | TypeScript tipini `ClinicSummary` ga `district: string \| null` qo'shing. |
| Dropdown'da Toshkent tumanlari | `clinicsApi.listDistricts()` chaqirib, `key` ni `value`, `name` ni `label` qiling. |
| Google Maps integratsiya | Build paytida emas, runtime'da `configApi.getPublic().googleMapsBrowserKey` orqali yuklang. Bo'sh bo'lsa fallback ko'rsating. |

---

## 6) Reference implementation

`public/map/app.js` — vanilla JS reference. Toolchainsiz, bitta IIFE. O'qish uchun **150 qatordan kam** va u quyidagi 3 ta narsani namoyish qiladi:

1. `loadDistricts()` → dropdownni to'ldirish.
2. `findByGeolocation()` → `navigator.geolocation` + `radiusKm=5` bilan `/clinics/nearby` chaqirish.
3. `loadConfigAndInit()` → `/config/public` dan kalit olib, Google Maps JS API ni lazy yuklash.

Sizning Next.js / React frontendingizda ham xuddi shu pattern: dropdownni boot'da yuklang, geolocation tugmasi `5 km` fixedga ega, xarita scriptini runtime config'dan keyin yuklang.

---

## 7) TS tip mapping (taklif)

```ts
export type District =
  | 'Bektemir' | 'Chilonzor' | 'Mirobod' | 'Mirzo Ulug‘bek'
  | 'Olmazor' | 'Sergeli' | 'Shayxontohur' | 'Uchtepa'
  | 'Yakkasaroy' | 'Yangi Hayot' | 'Yashnobod' | 'Yunusobod';

export interface DistrictItem {
  key: District;
  name: string;
  lat: number;
  lng: number;
  clinicCount: number;
}

export interface OpeningSlot { open: string; close: string; }
export interface OpeningDay { open: string; close: string; } // OpeningSlot bilan bir xil
export type OpeningHours = Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', OpeningDay | null>;

export interface ClinicSummary {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  district: District | null;          // YANGI
  latitude: number;
  longitude: number;
  distanceKm: number;
  isOpenNow: boolean;
  todayHours: OpeningDay | null;
  averageRating: number | null;
  reviewCount: number;
}

export interface SearchCenter {
  lat: number;
  lng: number;
  query?: string | null;
  district?: District | null;
}

export interface NearbyResponse {
  clinics: ClinicSummary[];
  searchCenter?: SearchCenter;
}

export interface PublicConfig {
  googleMapsBrowserKey: string | null;
}
```

> Tip: `District` ni hardcode qilmang — runtime'da `DistrictItem['key']` orqali aniqlangani yaxshiroq. Yuqoridagi union faqat IDE autocomplete uchun foydali; o'zgartirilsa joriy kod buzilmaydi (string sifatida qabul qilinadi).

---

## 8) Migratsiya checklist (frontend tarafi)

- [ ] `clinicsApi.listDistricts()` qo'shildi (yoki shunga teng funksiya).
- [ ] `configApi.getPublic()` qo'shildi.
- [ ] `clinicsApi.getNearby()` `district` parametrini qabul qiladi.
- [ ] `ClinicSummary` tipida `district: string | null` mavjud.
- [ ] Dropdown komponent `/clinics/districts` dan to'ldirilmoqda.
- [ ] "Yaqin atrofdagi klinikalar (5 km)" tugmasi geolocation orqali `/clinics/nearby` ga `radiusKm=5` yuboradi.
- [ ] Google Maps kalit runtime'da yuklanadi (build-time emas).
- [ ] Empty state: tumanlar dropdowni `clinicCount = 0` ni `disabled` qilib ko'rsatadi (yoki yashiradi).

---

## 9) Aloqa

- Swagger UI: `http://localhost:4000/docs` — yangi endpointlar **Clinics** va **Config** taglari ostida.
- OpenAPI: `docs/openapi.yaml` (versiyalangan, single source of truth).
- Backend savollar: `CLAUDE.md` (root) — 2026-05-16 bo'limini o'qing.
- Issue: feature branch `main` ga merge qilindi (commit `cf83457`).
