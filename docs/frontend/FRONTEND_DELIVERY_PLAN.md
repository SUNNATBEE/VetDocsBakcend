# Frontend Delivery Plan

## 1) Ishlash modeli

- Sprint length: 1 hafta
- Demo cadence: har hafta yakuni
- Branch policy: `feature/*` -> PR -> `develop` -> `main`
- Merge strategy: squash merge

## 2) Team ownership (short form)

- Tech Lead: infra, API client, CI/CD, review gate
- Auth owner: auth pages, token UX, route guard
- Clinics owner: list, detail, map, filters
- Reviews owner: CRUD, optimistic updates
- Admin owner: dashboard + full CRUD pages
- UI owner: design system + shared components

## 3) Sprint reja

### Sprint 1 — Foundation

- Next.js + TS + Tailwind + shadcn setup
- API client + auth interceptor
- Global providers + error boundaries
- Base layout + navigation skeleton

### Sprint 2 — Core user flow

- Register/login/logout UX
- Clinics nearby list + detail page
- Basic search + filter

### Sprint 3 — Reviews + map

- Review create/update/delete UX
- Clinic map + marker + popup
- Profile basics

### Sprint 4 — Admin MVP

- Admin dashboard
- Clinics CRUD
- Users/reviews moderation

### Sprint 5 — QA + release

- Cross-browser test
- E2E smoke suite
- Performance + a11y polish
- Production deploy

## 4) Definition of Done (strict)

Har task tugashi uchun:

- TS xato 0
- ESLint warning 0
- Loading/error/empty states bor
- Mobile/desktop tekshirildi
- API integration real backend bilan tasdiqlandi
- PR review approved
- Docs yangilandi

## 5) PR template (minimal)

```md
## Scope
- ...

## Test plan
- [ ] Local QA
- [ ] API integration
- [ ] Mobile check

## Risks
- ...

## Screenshots
- ...
```

## 6) Release readiness checklist

- `.env` qiymatlar productionga mos
- API URL to'g'ri
- Admin route guard ishlaydi
- Build + start scripts yashil
- E2E smoke critical flow o'tdi
- Rollback rejasi tayyor
