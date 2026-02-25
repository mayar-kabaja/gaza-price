/**
 * API error handling for gaza-price frontend.
 * All API errors come from the backend in Arabic. Never hardcode or translate in frontend.
 *
 * Failed response shape:
 * { error: string, message: string, retry_after_seconds?: number, similar?: Array<...> }
 */

import { createClient } from "@/lib/supabase/client";

export interface ApiErrorResponse {
  error: string;
  message: string;
  retry_after_seconds?: number;
  similar?: Array<{ id: string; name_ar: string; similarity: number }>;
}

/** Clear Supabase session and redirect to home. Use on 401. */
export async function clearSessionAndRedirect(router: { replace: (url: string) => void }): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  router.replace("/");
}

/**
 * Handle a failed API response: set message for display, and on 401 clear session and redirect.
 * Call after: const data = await res.json(); if (!res.ok) { handleApiError(res, data, setError, router); return; }
 *
 * - 401 → clearSessionAndRedirect(router), then setError(message) so it shows briefly if redirect is slow
 * - Other → setError(data.message)
 */
export function handleApiError(
  res: Response,
  data: ApiErrorResponse | Record<string, unknown>,
  setError: (msg: string) => void,
  router: { replace: (url: string) => void }
): void {
  const message = typeof (data as ApiErrorResponse).message === "string" ? (data as ApiErrorResponse).message : "حدث خطأ غير متوقع، جرّب مرة أخرى";
  setError(message);
  if (res.status === 401) {
    clearSessionAndRedirect(router);
  }
}
