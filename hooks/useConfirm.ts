"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/prices/${priceId}/confirm`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        handleApiError(res, data as ApiErrorResponse, setError, router);
        return;
      }

      setConfirmed(true);
      setCount(
        data && "new_confirmation_count" in data
          ? toNumber(data.new_confirmation_count)
          : toNumber(initialCount) + 1
      );
    } catch {
      setError("حدث خطأ غير متوقع، جرّب مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return { count, confirmed, loading, error, setError, confirm };
}
