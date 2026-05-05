#!/usr/bin/env bash
# =============================================================================
# admin-login.cli-session.sh
#
# Manual / interactive replay of the admin login happy path using `playwright-cli`.
# This is the recording-style workflow described in the playwright-cli skill —
# run it line by line in a terminal, watch the snapshots, and copy the generated
# Playwright code into admin-login.spec.ts when you want to extend the suite.
#
# Prereqs:
#   playwright-cli install --skills
#   playwright-cli install-browser
#   npm run dev           # in another terminal — admin SPA at http://localhost:4000/admin
#
# Usage:
#   bash tests/e2e/admin-login.cli-session.sh
#
# Element refs (e1, e2, ...) are reassigned on every snapshot. The numbers below
# are illustrative — re-run `playwright-cli snapshot` if the layout changes.
# =============================================================================

set -euo pipefail

BASE_URL="${E2E_BASE_URL:-http://localhost:4000}"
ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-admin@vetclinic.uz}"
ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-Admin12345!}"

echo "→ opening admin SPA"
playwright-cli open "$BASE_URL/admin"

echo "→ snapshot to discover element refs"
playwright-cli snapshot --filename=tests/e2e/.snapshots/login-page.yaml

# Expected refs from the login form (re-check after each layout change):
#   e? [textbox  "Email"]
#   e? [textbox  "Parol"]
#   e? [button   "Kirish"]
#
# Replace e1/e2/e3 below with the values your snapshot prints.

EMAIL_REF="${EMAIL_REF:-e1}"
PASSWORD_REF="${PASSWORD_REF:-e2}"
SUBMIT_REF="${SUBMIT_REF:-e3}"

echo "→ filling credentials"
playwright-cli fill "$EMAIL_REF" "$ADMIN_EMAIL"
playwright-cli fill "$PASSWORD_REF" "$ADMIN_PASSWORD"

echo "→ submitting"
playwright-cli click "$SUBMIT_REF"

echo "→ snapshot after login (should show #shell and #pageTitle = 'Boshqaruv')"
playwright-cli snapshot --filename=tests/e2e/.snapshots/post-login.yaml
playwright-cli screenshot --filename=tests/e2e/.snapshots/post-login.png

echo "→ assert tokens are stored"
playwright-cli eval "({ access: sessionStorage.getItem('vc_access'), refresh: localStorage.getItem('vc_refresh') })"

echo "→ saving auth state for reuse in subsequent test runs"
playwright-cli state-save tests/e2e/.snapshots/admin-auth.json

echo "→ logging out"
playwright-cli snapshot >/dev/null   # refresh refs
LOGOUT_REF="${LOGOUT_REF:-e15}"      # 'Chiqish' button — adjust per snapshot
playwright-cli click "$LOGOUT_REF" || true

echo "→ closing browser"
playwright-cli close

echo "✓ session complete. Output: tests/e2e/.snapshots/"
