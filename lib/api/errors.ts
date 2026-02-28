/**
 * API error handling. All API errors come from the backend in Arabic.
 * On 401 we clear the stored token and redirect (no Supabase on frontend).
 */

import { clearStoredToken } from "@/lib/auth/token";

export interface ApiErrorResponse {
  error: string;
  message: string;
  retry_after_seconds?: number;
  similar?: Array<{ id: string; name_ar: string; similarity: number }>;
}

/** Clear stored auth token and redirect to home. Use on 401. */
export function clearSessionAndRedirect(router: { replace: (url: string) => void }): void {
  clearStoredToken();
  router.replace("/");
}

/**
 * Handle a failed API response: set message for display, and on 401 clear session and redirect.
 * Call after: const data = await res.json(); if (!res.ok) { handleApiError(res, data, setError, router); return; }
 *
 * - 401 → show generic message (never "session expired" / "reload"), then clearSessionAndRedirect(router)
 * - Other → setError(data.message)
 */
export function handleApiError(
  res: Response,
  data: ApiErrorResponse | Record<string, unknown>,
  setError: (msg: string) => void,
  router: { replace: (url: string) => void }
): void {
  const message =
    res.status === 401
      ? "حدث خطأ، حاول مرة أخرى"
      : typeof (data as ApiErrorResponse).message === "string"
        ? (data as ApiErrorResponse).message
        : "حدث خطأ غير متوقع، جرّب مرة أخرى";
  setError(message);
  if (res.status === 401) {
    clearSessionAndRedirect(router);
  }
}
