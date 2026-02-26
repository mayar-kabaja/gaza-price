/**
 * Backend API client for https://gaza-price-backend.onrender.com
 * Set NEXT_PUBLIC_API_URL in .env (e.g. https://gaza-price-backend.onrender.com or .../api)
 */

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_URL is not set");
  return url.replace(/\/$/, "");
}

function buildUrl(base: string, path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const base = getBaseUrl();
  let url = buildUrl(base, path, params);
  let res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(25000), // 25s for Render cold start
  });
  // If 404 and base ends with /api, retry without /api (backend might be at root)
  if (res.status === 404 && base.endsWith("/api")) {
    const baseRoot = base.replace(/\/api\/?$/, "");
    url = buildUrl(baseRoot, path, params);
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(25000),
    });
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Use when API might not be configured (e.g. home page). Returns null if env missing. */
export function getApiBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_API_URL;
  return url ? url.replace(/\/$/, "") : null;
}

/** POST to backend (e.g. confirm, report). Returns response JSON; throws on !res.ok. */
export async function apiPost<T = unknown>(
  path: string,
  body?: object,
  headers?: Record<string, string>,
  opts?: { timeoutMs?: number }
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set");
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const timeoutMs = opts?.timeoutMs ?? 25000;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function fetchBackend<T>(
  method: "GET" | "PATCH" | "DELETE",
  path: string,
  opts?: { body?: object; headers?: Record<string, string> }
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set");
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...opts?.headers,
  };
  if (opts?.body) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") return undefined as T;
  return (await res.json()) as T;
}

export function apiGetWithHeaders<T>(path: string, headers: Record<string, string>): Promise<T> {
  return fetchBackend<T>("GET", path, { headers });
}

export function apiPatch<T = unknown>(path: string, body?: object, headers?: Record<string, string>): Promise<T> {
  return fetchBackend<T>("PATCH", path, { body, headers });
}

export function apiDelete<T = unknown>(path: string, headers?: Record<string, string>): Promise<T> {
  return fetchBackend<T>("DELETE", path, { headers });
}
