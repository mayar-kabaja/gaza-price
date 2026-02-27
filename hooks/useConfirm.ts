"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken } from "@/lib/auth/token";
import { handleApiError } from "@/lib/api/errors";
import type { ApiErrorResponse } from "@/lib/api/errors";

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function useConfirm(initialCount: number, priceId: string) {
  const router = useRouter();
  const [count, setCount] = useState(() => toNumber(initialCount));
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (confirmed || loading) return;
    if (!priceId) return;

    const accessToken = getStoredToken();
    if (!accessToken) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/prices/${priceId}/confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();

      if (!res.ok) {
        handleApiError(res, data as ApiErrorResponse, setError, router);
        return;
      }

      setConfirmed(data?.confirmed ?? true);
      setCount(toNumber(data?.confirmation_count ?? count));
    } catch {
      setError("حدث خطأ غير متوقع، جرّب مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return { count, confirmed, loading, error, setError, confirm };
}
