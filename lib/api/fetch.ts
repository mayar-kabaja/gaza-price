/**
 * Central API fetch wrapper. All API calls go through this.
 * Calls the backend directly (no Next.js proxy).
 * - Adds stored token to Authorization when available.
 * - On 401: clears token, creates new session, retries request once.
 */

import { getStoredToken, setStoredToken, clearStoredToken, getAdminToken } from "@/lib/auth/token";

function getBackendUrl(): string {
  // Server-side: use the full backend URL
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  }
  // Client-side: use relative URL so it goes through the Next.js proxy
  return "";
}

/** Convert relative paths like "/api/areas" or "/areas" to full backend URL */
function resolveUrl(url: string): string {
  if (url.startsWith("http")) return url;
  const base = getBackendUrl();
  if (!base) {
    // Client-side: keep as /api/... path (goes through Next.js proxy routes)
    if (url.startsWith("/api/")) return url;
    return `/api${url}`;
  }
  // Server-side: resolve to full backend URL
  if (url.startsWith("/api/")) return `${base}${url.slice(4)}`;
  return `${base}${url}`;
}

export async function refreshToken(): Promise<string | null> {
  try {
    const base = getBackendUrl();
    const res = await fetch(`${base}/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token = data?.access_token;
    if (typeof token !== "string") return null;
    setStoredToken(token);
    return token;
  } catch {
    return null;
  }
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const fullUrl = resolveUrl(url);
  const token = getStoredToken();

  const mergedHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const firstRes = await fetch(fullUrl, {
    ...options,
    headers: mergedHeaders,
  });

  if (firstRes.status !== 401) return firstRes;

  clearStoredToken();
  const newToken = await refreshToken();
  if (!newToken) return firstRes;

  return fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${newToken}`,
    },
  });
}

/** Use for admin API routes. Sends admin JWT instead of contributor token. */
export async function apiFetchAdmin(url: string, options: RequestInit = {}): Promise<Response> {
  const fullUrl = resolveUrl(url);
  const token = getAdminToken();
  const mergedHeaders: HeadersInit = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  if (options.method !== "GET" && options.body !== undefined) {
    (mergedHeaders as Record<string, string>)["Content-Type"] =
      (options.headers as Record<string, string>)?.["Content-Type"] ?? "application/json";
  }
  return fetch(fullUrl, {
    ...options,
    headers: mergedHeaders,
  });
}
