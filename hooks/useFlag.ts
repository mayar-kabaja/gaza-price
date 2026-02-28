"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/fetch";
import { setStoredToken } from "@/lib/auth/token";
import { handleApiError } from "@/lib/api/errors";
import type { ApiErrorResponse } from "@/lib/api/errors";

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function useFlag(
  initialCount: number,
  priceId: string,
  options?: { onSuccess?: (flagged: boolean, newCount: number) => void; initialFlagged?: boolean }
) {
  const router = useRouter();
  const [count, setCount] = useState(() => toNumber(initialCount));
  const [flagged, setFlagged] = useState(() => !!options?.initialFlagged);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSuccessRef = useRef(options?.onSuccess);
  useEffect(() => {
    onSuccessRef.current = options?.onSuccess;
  }, [options?.onSuccess]);

  async function toggle(reason?: string) {
    if (loading) return;
    if (!priceId) return;

    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch(`/api/prices/${priceId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reason ? { reason } : {}),
      });
      const data = await res.json();

      if (!res.ok) {
        handleApiError(res, data as ApiErrorResponse, setError, router);
        return;
      }

      if (typeof (data as { access_token?: string }).access_token === "string") {
        setStoredToken((data as { access_token: string }).access_token);
      }
      const newFlagged = !!(data as { flagged?: boolean }).flagged;
      const newCount = toNumber((data as { flag_count?: number }).flag_count ?? count);
      setFlagged(newFlagged);
      setCount(newCount);
      onSuccessRef.current?.(newFlagged, newCount);
    } catch {
      setError("حدث خطأ غير متوقع، جرّب مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return { count, flagged, loading, error, setError, toggle };
}
