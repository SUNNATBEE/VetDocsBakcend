import { APIRequestContext, expect } from '@playwright/test';

export const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@vetclinic.uz';
export const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin12345!';

export const API_PREFIX = '/api/v1';

export type AuthResponse = {
  user: { id: string; email: string; name: string | null; role: 'USER' | 'ADMIN' };
  accessToken: string;
  refreshToken: string;
};

export async function registerUser(
  request: APIRequestContext,
  override?: Partial<{ email: string; password: string; name: string }>,
): Promise<AuthResponse> {
  const email = override?.email ?? `e2e_user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;
  const password = override?.password ?? 'TestPass123!';
  const res = await request.post(`${API_PREFIX}/auth/register`, {
    data: { email, password, name: override?.name ?? 'E2E User' },
  });
  expect(res.ok(), `register failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  return body.data as AuthResponse;
}
