# `tests/e2e/` — Playwright End-to-End Tests

Browser-driven tests for the admin SPA at `/admin`. The first suite covers the **admin login flow** — the only gate to every other admin operation.

## Files

| File | Purpose |
|---|---|
| `admin-login.spec.ts` | Five Playwright tests: happy-path login, wrong password, non-admin rejection, logout, reload session restore. |
| `helpers.ts` | `registerUser(request)` creates a USER via `/api/v1/auth/register`. Reads admin creds from env. |
| `admin-login.cli-session.sh` | Recording-style replay using `playwright-cli`. Source for new test cases — run it, copy the generated code, paste into `admin-login.spec.ts`. |
| `../../playwright.config.ts` | Single chromium project, runs `npm run start` as a webServer unless `E2E_NO_WEBSERVER=1`. |

## How the suite is wired

- `playwright.config.ts` boots the API via `npm run start` and waits for `/api/v1/health` before launching the browser. Set `E2E_NO_WEBSERVER=1` if you have the dev server already running (faster local loop).
- `fullyParallel: false` — tests share the seeded admin account and we don't want flaky races on storage state.
- `beforeEach` clears cookies + `sessionStorage` + `localStorage` so every test starts cold.

## Selectors policy

Prefer **role/label** locators over CSS selectors:

```ts
page.getByLabel('Email')                    // good
page.getByRole('button', { name: 'Kirish' }) // good
page.locator('#loginForm input[name=email]') // last resort
```

We use IDs (`#login`, `#shell`, `#meBox`, `#toast`, `#loginError`, `#pageTitle`, `#logoutBtn`) only when the SPA gives no semantic anchor — those IDs are part of the SPA contract documented in `public/admin/CLAUDE.md`.

## Test data

- **Admin** — must already exist in the target DB. Run `npm run db:seed` once before the e2e suite. Credentials come from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars (default `admin@vetclinic.uz` / `Admin12345!`).
- **Regular USER** — created on the fly via `registerUser(request)` with a random email (`e2e_user_<ts>_<rand>@test.local`). These accumulate in the DB; clean them up periodically with `DELETE FROM "User" WHERE email LIKE 'e2e_user_%@test.local'` if it bothers you.

## Running

```bash
# install deps (one-time)
npm i -D @playwright/test
npx playwright install chromium

# point at a fresh dev DB so seeded admin works
npm run db:migrate
npm run db:seed

# run the suite (boots its own server)
npx playwright test

# fast loop: dev server already up, headed browser
E2E_NO_WEBSERVER=1 npx playwright test --headed --project=chromium

# debug a single test
npx playwright test admin-login.spec.ts -g 'wrong password' --debug
```

Failures save traces (`test-results/<test>/trace.zip`), screenshots, and videos under `test-results/`.

## Adding new flows (recipe)

1. Open the recording session: `bash tests/e2e/admin-login.cli-session.sh`. After the first `snapshot`, copy the element refs that map to the controls you care about.
2. Drive the new flow with `playwright-cli click/fill/...`. Each command prints the equivalent Playwright TypeScript line.
3. Paste those lines into a new `*.spec.ts` file (or extend `admin-login.spec.ts`). Wrap them in a `test(...)` block and add `expect(...)` assertions for the behavior you want to lock in.
4. Replace any positional CSS selectors the recorder produced with role/label locators. The recorder usually picks the right thing, but it sometimes falls back to `nth-of-type` — that's fragile.

## What NOT to do

- **Don't write tests against `localhost:4000` if the admin DB already has production data.** `registerUser` writes real rows; running the full suite there leaves litter.
- **Don't store admin passwords in the spec.** Read from env (`SEED_ADMIN_EMAIL`/`PASSWORD`). The defaults are intentionally weak so the test fails closed when env is misconfigured.
- **Don't add `await page.waitForTimeout(...)`.** Use Playwright's auto-waiting locators (`expect(...).toBeVisible()`) — sleep-waits hide real timing bugs.
- **Don't share `page` across tests.** Each test gets its own page from the fixture; persisting state between tests turns this suite into a fragile integration test.
