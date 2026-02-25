"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

    setError(null);
    setConfirmed(true);
    setCount((c) => c + 1);
    setLoading(true);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

    try {
      const res = await fetch(`/api/prices/${priceId}/confirm`, {
        method: "POST",
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        setConfirmed(false);
        setCount((c) => c - 1);
        handleApiError(res, data as ApiErrorResponse, setError, router);
        return;
      }

      setCount((c) =>
        data && "new_confirmation_count" in data
          ? toNumber(data.new_confirmation_count)
          : c
      );
    } catch {
      setConfirmed(false);
      setCount((c) => c - 1);
      setError("حدث خطأ غير متوقع، جرّب مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return { count, confirmed, loading, error, setError, confirm };
}
