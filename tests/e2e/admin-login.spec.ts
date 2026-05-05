import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, registerUser } from './helpers';

const ADMIN_URL = '/admin';

test.describe('Admin SPA — login flow', () => {
  test.beforeEach(async ({ page }) => {
    // Each test starts in a clean storage state.
    await page.context().clearCookies();
    await page.goto(ADMIN_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(ADMIN_URL);
  });

  test('admin can log in and lands on the dashboard', async ({ page }) => {
    await expect(page.locator('#login')).toBeVisible();
    await expect(page.locator('#shell')).toBeHidden();

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Parol').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Kirish' }).click();

    // Shell becomes visible, login is hidden, hash routes to dashboard.
    await expect(page.locator('#shell')).toBeVisible();
    await expect(page.locator('#login')).toBeHidden();
    await expect(page).toHaveURL(/#dashboard$/);
    await expect(page.locator('#pageTitle')).toHaveText('Boshqaruv');

    // Sidebar reflects the signed-in admin.
    await expect(page.locator('#meBox')).toContainText(ADMIN_EMAIL);
    await expect(page.locator('#meBox .badge--admin')).toHaveText('ADMIN');

    // Tokens were persisted by the SPA.
    const storage = await page.evaluate(() => ({
      access: sessionStorage.getItem('vc_access'),
      refresh: localStorage.getItem('vc_refresh'),
      me: localStorage.getItem('vc_me'),
    }));
    expect(storage.access).toMatch(/^eyJ/); // JWT header
    expect(storage.refresh).toHaveLength(96); // 48 random bytes hex-encoded
    expect(JSON.parse(storage.me!).role).toBe('ADMIN');

    // A toast acknowledges the login.
    await expect(page.locator('#toast')).toContainText('Kirish muvaffaqiyatli');
  });

  test('wrong password keeps the user on the login screen with an inline error', async ({ page }) => {
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Parol').fill('definitely-wrong-password');
    await page.getByRole('button', { name: 'Kirish' }).click();

    const error = page.locator('#loginError');
    await expect(error).toBeVisible();
    await expect(error).toContainText(/email yoki parol/i);

    // Login UI is still up; shell never rendered.
    await expect(page.locator('#login')).toBeVisible();
    await expect(page.locator('#shell')).toBeHidden();

    // No tokens were stored.
    const access = await page.evaluate(() => sessionStorage.getItem('vc_access'));
    expect(access).toBeNull();
  });

  test('non-admin user is rejected by the SPA even with valid credentials', async ({ page, request }) => {
    const user = await registerUser(request);
    expect(user.user.role).toBe('USER');

    await page.getByLabel('Email').fill(user.user.email);
    await page.getByLabel('Parol').fill('TestPass123!');
    await page.getByRole('button', { name: 'Kirish' }).click();

    await expect(page.locator('#loginError')).toContainText('ADMIN');
    await expect(page.locator('#login')).toBeVisible();
    await expect(page.locator('#shell')).toBeHidden();

    // Storage stays empty — the SPA never persists USER sessions.
    const stored = await page.evaluate(() => sessionStorage.getItem('vc_access'));
    expect(stored).toBeNull();
  });

  test('logout clears storage and returns to the login screen', async ({ page }) => {
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Parol').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Kirish' }).click();
    await expect(page.locator('#shell')).toBeVisible();

    await page.getByRole('button', { name: 'Chiqish' }).click();

    await expect(page.locator('#login')).toBeVisible();
    await expect(page.locator('#shell')).toBeHidden();

    const cleared = await page.evaluate(() => ({
      access: sessionStorage.getItem('vc_access'),
      refresh: localStorage.getItem('vc_refresh'),
      me: localStorage.getItem('vc_me'),
    }));
    expect(cleared).toEqual({ access: null, refresh: null, me: null });
  });

  test('reload after admin login restores the session from storage', async ({ page }) => {
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Parol').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Kirish' }).click();
    await expect(page.locator('#shell')).toBeVisible();

    await page.reload();

    // Boot path reads sessionStorage.access + localStorage.me and goes straight to the shell.
    await expect(page.locator('#shell')).toBeVisible();
    await expect(page.locator('#login')).toBeHidden();
    await expect(page.locator('#pageTitle')).toHaveText('Boshqaruv');
  });
});
