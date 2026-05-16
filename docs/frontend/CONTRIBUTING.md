# Contributing Guide (Frontend)

## 1. Branch strategy

- Base branch: `develop`
- Feature branch: `feature/<owner>-<short-task>`
- Fix branch: `fix/<short-task>`
- Hotfix branch: `hotfix/<short-task>`

Examples:

- `feature/suhrob-auth-login`
- `feature/doniyor-clinics-map`
- `fix/reviews-empty-state`

## 2. Development flow

1. Sync with latest `develop`.
2. Create a new feature branch.
3. Implement in small commits.
4. Run local quality checks.
5. Open PR to `develop`.
6. Get at least 1 approval.
7. Squash merge.

## 3. Required local checks before PR

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

If your change touches critical flow (auth/admin), run E2E smoke:

- `npm run test:e2e`

## 4. Coding conventions

- TypeScript strict mode, no `any`.
- Keep pages thin; business logic in `features/*`.
- Use shared API client, no random `fetch` calls in components.
- Handle `loading`, `error`, and `empty` states in all async screens.
- Keep user-visible copy in Uzbek.

## 5. Commit message convention

Use Conventional Commits:

- `feat(auth): add login form validation`
- `fix(clinics): handle null opening hours`
- `refactor(api): centralize error parsing`
- `docs(frontend): update delivery plan`

## 6. PR quality bar

A PR is reviewable only if:

- scope is focused (single responsibility),
- screenshots/GIF provided for UI change,
- test plan is written and reproducible,
- migration or backend dependency is clearly stated.

## 7. Review expectations

- Reviewer focuses on correctness, regressions, security, and UX states.
- Author addresses all comments or documents why not.
- No force-push to shared branch after review starts (unless requested).
