"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch";
import { setStoredToken } from "@/lib/auth/token";
import { handleApiError } from "@/lib/api/errors";
import type { ApiErrorResponse } from "@/lib/api/errors";
import { playSound } from "@/lib/sounds";
import { event as gtagEvent } from "@/lib/gtag";

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
  const queryClient = useQueryClient();
  const [count, setCount] = useState(() => toNumber(initialCount));
  const [confirmed, setConfirmed] = useState(() => !!options?.initialConfirmed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSuccessRef = useRef(options?.onSuccess);
  useEffect(() => {
    onSuccessRef.current = options?.onSuccess;
  }, [options?.onSuccess]);

  // Always sync with server data when props change (e.g. after refetch)
  useEffect(() => {
    setCount(toNumber(initialCount));
  }, [initialCount]);

  useEffect(() => {
    setConfirmed(!!options?.initialConfirmed);
  }, [options?.initialConfirmed]);

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
        playSound("error");
        handleApiError(res, data as ApiErrorResponse, setError, router);
        return;
      }

      if (typeof (data as { access_token?: string }).access_token === "string") {
        setStoredToken((data as { access_token: string }).access_token);
      }
      gtagEvent({ action: "confirm_price", category: "engagement", label: priceId });
      const newCount = toNumber(data?.confirmation_count ?? count);
      const newConfirmed = data?.confirmed ?? !confirmed;
      setConfirmed(newConfirmed);
      setCount(newCount);
      // Invalidate cached queries so next render/reload shows fresh data
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["prices"] });
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
      playSound("error");
      setError("حدث خطأ غير متوقع، جرّب مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return { count, confirmed, loading, error, setError, confirm };
}
