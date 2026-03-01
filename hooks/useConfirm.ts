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

export function useConfirm(
  initialCount: number,
  priceId: string,
  options?: {
    onSuccess?: (newCount: number, extra?: { flag_count?: number; flagged?: boolean; confirmed?: boolean }) => void;
    initialConfirmed?: boolean;
  }
) {
  const router = useRouter();
  const [count, setCount] = useState(() => toNumber(initialCount));
  const [confirmed, setConfirmed] = useState(() => !!options?.initialConfirmed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSuccessRef = useRef(options?.onSuccess);
  useEffect(() => {
    onSuccessRef.current = options?.onSuccess;
  }, [options?.onSuccess]);

  async function confirm() {
    if (loading) return;
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
      const newCount = toNumber(data?.confirmation_count ?? count);
      setConfirmed(data?.confirmed ?? true);
      setCount(newCount);
      const extra =
        typeof data?.flag_count === "number" ||
        typeof data?.flagged === "boolean" ||
        typeof data?.confirmed === "boolean"
          ? {
              flag_count: data?.flag_count as number | undefined,
              flagged: data?.flagged as boolean | undefined,
              confirmed: data?.confirmed as boolean | undefined,
            }
          : undefined;
      onSuccessRef.current?.(newCount, extra);
    } catch {
      setError("حدث خطأ غير متوقع، جرّب مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return { count, confirmed, loading, error, setError, confirm };
}
