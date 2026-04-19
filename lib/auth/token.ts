/**
 * Auth token storage keys (localStorage). Admin and contributor use separate keys
 * so reports/submit always use contributor (Supabase) token, not admin JWT.
 */
export const AUTH_TOKEN_KEY = "gaza_price_access_token";
export const ADMIN_TOKEN_KEY = "gaza_price_admin_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  const oldValue = localStorage.getItem(AUTH_TOKEN_KEY);
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  // Manually dispatch storage event so the same tab picks up the change
  // (native storage events only fire in other tabs)
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: AUTH_TOKEN_KEY,
      oldValue,
      newValue: token,
      storageArea: localStorage,
    })
  );
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  const oldValue = localStorage.getItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: AUTH_TOKEN_KEY,
      oldValue,
      newValue: null,
      storageArea: localStorage,
    })
  );
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}
