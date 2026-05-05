# `public/admin/` — Admin SPA (Vanilla JS)

Single-page admin console served as a static bundle from `/admin`. Three files, no build step, no framework. Talks only to `/api/v1/admin/*` and `/api/v1/auth/*`.

## Files

- `index.html` — shell + login form + router targets (`#view`, `#modal`, `#toast`).
- `styles.css` — design tokens via CSS variables; dark/light handled by the variables, not by class toggling.
- `app.js` — IIFE-scoped SPA: storage adapter, fetch wrapper, hash router, view functions.

## Why no framework

- The admin UI is a thin tool — adding React/Vite + a build step would dwarf the surface area.
- `helmet`'s default CSP is **disabled** (`app.js` in the backend) precisely because this SPA inlines a `<script>` tag and uses `innerHTML` rendering. If you ever switch this to a bundler-built SPA, re-enable CSP and remove inline scripts.

## State + storage

```js
STORE.access   ← sessionStorage (clears on tab close)
STORE.refresh  ← localStorage   (persists between sessions)
STORE.me       ← localStorage   (last known user; refreshed on login & token refresh)
```

The split is intentional: an attacker with XSS still can't lift the access token after the tab closes (small mitigation; the refresh token in `localStorage` is the real session). If you ever move to a backend that issues refresh tokens via `HttpOnly` cookies, drop these `localStorage` writes.

## API wrapper (`app.js::api`)

- Reads `STORE.access` and attaches `Authorization: Bearer …`.
- On `401 + code === 'TOKEN_EXPIRED'` (and `retry` is still allowed), calls `tryRefresh()` and replays the request once. `tryRefresh` failure forces a logout. **Don't** retry on other 401 codes — `INVALID_TOKEN` and `UNAUTHORIZED` mean refresh won't help.
- Throws an `Error` decorated with `.code`, `.status`, `.details` so `handleError` can surface validation specifics in modals.

## Router

Hash-based: `#dashboard`, `#clinics`, `#reviews`, `#users`. Allowed list is `ROUTES`. Unknown hash redirects to `#dashboard`. `hashchange` triggers `route()`.

Search is a single `#searchInput` debounced 300 ms; visibility is per-route (hidden on `#dashboard`).

## XSS posture

Every dynamic value rendered into `innerHTML` goes through `esc()`, which escapes `& < > " '`. **If you add a new field to a row template, it must be wrapped in `esc(…)`.** Skipping this is the most likely way to introduce a stored-XSS bug — especially for the `comment` field, which users control.

The `confirmDialog` body uses `esc(msg)` because it's plain text. The `clinicForm` reuses `esc(existing?.field)` for input `value="…"` attributes.

## Forms

- `clinicForm(existing?)` is the create/edit modal. It builds opening hours from a 7-row grid; the "Yopiq" checkbox toggles `disabled` on the time inputs and produces `null` for that day's slot. The default schedule (when no `existing`) is Mon–Fri 09:00–19:00, Sat 10:00–16:00, Sun closed.
- The form sends the **full** payload on PATCH (matching `clinicCreateSchema.partial()`'s acceptance). If you change validation to require `openingHours` on PATCH, also adjust the form.

## Wiring a new admin entity

1. Add the entity's API in `src/modules/admin/`.
2. Add the route name to `ROUTES`.
3. Add a `viewX(page)` async function that calls `api('/admin/x', { query: ... })` and renders via `renderTable(...)`.
4. If it has create/edit, add a form modal that calls `openModal(...)` with an inline `<form>` and wires submit.
5. Handle `data-edit` and `data-del` buttons consistently with the existing pattern (use `confirmDialog` for destructive actions).

## What NOT to do

- Don't `innerHTML` a value that hasn't been through `esc(...)`. There is no template engine to save you.
- Don't store the access token in `localStorage` — keep it in `sessionStorage`.
- Don't introduce a build step without also enabling the backend's CSP and migrating away from inline scripts.
- Don't add a third-party UI library to fix one component. The whole point of this folder is "no toolchain".
