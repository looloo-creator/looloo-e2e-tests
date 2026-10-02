import type { APIRequestContext } from '@playwright/test';

export const BASE_URL = (process.env.BASE_URL || 'http://localhost:18080').replace(/\/+$/, '');
export const API_BASE = (process.env.API_BASE || `${BASE_URL}/api`).replace(/\/+$/, '');

export async function getTestToken(
  request: APIRequestContext,
  email: string,
): Promise<string | undefined> {
  const response = await request.post(`${API_BASE}/users/test-token`, {
    data: { provider: 'e2e', email },
  });

  if (response.status() === 404) {
    return undefined;
  }
  if (!response.ok()) {
    throw new Error(`Test-token endpoint returned HTTP ${response.status()}`);
  }

  const body = await response.json();
  const token = body?.data?.data?.jwt ?? body?.data?.jwt;
  return typeof token === 'string' ? token : undefined;
}