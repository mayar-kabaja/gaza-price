/**
 * Central API fetch wrapper. All /api calls should go through this.
 * - Adds stored token to Authorization when available.
 * - On 401: clears token, gets new one from GET /api/auth/session, retries request once.
 * User never sees "reload" or "session expired" — we retry silently.
 */

import { getStoredToken, setStoredToken, clearStoredToken } from "@/lib/auth/token";

export async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/session", { method: "GET", credentials: "include" });
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
  const token = getStoredToken();

  const mergedHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const firstRes = await fetch(url, {
    ...options,
    headers: mergedHeaders,
    credentials: options.credentials ?? "include",
  });

  if (firstRes.status !== 401) return firstRes;

  clearStoredToken();
  const newToken = await refreshToken();
  if (!newToken) return firstRes;

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${newToken}`,
    },
    credentials: options.credentials ?? "include",
  });
}
