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
