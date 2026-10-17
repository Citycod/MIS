import { expect, type APIRequestContext, type Page } from "@playwright/test";

export async function csrfHeaders(page: Page): Promise<Record<string, string>> {
  const response = await page.request.get("/api/auth/csrf");
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as { token?: unknown };
  expect(typeof body.token).toBe("string");
  return { "x-csrf-token": String(body.token) };
}

export async function loginAs(page: Page, userId: string, route?: string): Promise<void> {
  const password = process.env.MIS_E2E_PASSWORD;
  if (!password) throw new Error("MIS_E2E_PASSWORD is required for authenticated browser tests.");
  const response = await page.request.post("/api/auth/login", {
    data: { username: userId, password }, headers: await csrfHeaders(page), maxRetries: 1,
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  if (route) await page.goto(route);
}

export async function csrfPost(page: Page, url: string, options: Parameters<APIRequestContext["post"]>[1] = {}) {
  const headers = { ...(options?.headers ?? {}), ...(await csrfHeaders(page)) };
  return page.request.post(url, { ...options, headers });
}
