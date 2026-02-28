"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/fetch";
import { setStoredToken } from "@/lib/auth/token";
import { handleApiError } from "@/lib/api/errors";
import type { ApiErrorResponse } from "@/lib/api/errors";

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function useConfirm(
  initialCount: number,
  priceId: string,
  options?: { onSuccess?: () => void }
) {
  const router = useRouter();
  const [count, setCount] = useState(() => toNumber(initialCount));
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (confirmed || loading) return;
    if (!priceId) return;

    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch(`/api/prices/${priceId}/confirm`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        handleApiError(res, data as ApiErrorResponse, setError, router);
        return;
      }

      if (typeof (data as { access_token?: string }).access_token === "string") {
        setStoredToken((data as { access_token: string }).access_token);
      }
      setConfirmed(data?.confirmed ?? true);
      setCount(toNumber(data?.confirmation_count ?? count));
      options?.onSuccess?.();
    } catch {
      setError("حدث خطأ غير متوقع، جرّب مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return { count, confirmed, loading, error, setError, confirm };
}
