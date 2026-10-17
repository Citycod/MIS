let csrfToken = "";

export async function getCsrfToken(refresh = false): Promise<string> {
  if (csrfToken && !refresh) return csrfToken;
  const response = await fetch("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error("Unable to initialize the security token.");
  const body = await response.json() as { token?: unknown };
  if (typeof body.token !== "string" || !body.token) throw new Error("Invalid security token response.");
  csrfToken = body.token;
  return csrfToken;
}

export async function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await getCsrfToken();
  const headers = new Headers(init.headers);
  headers.set("x-csrf-token", token);
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}
