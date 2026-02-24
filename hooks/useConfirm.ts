"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useConfirm(initialCount: number, priceId: string) {
  const [count, setCount] = useState(initialCount);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    if (confirmed || loading) return;

    // Optimistic update
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

      if (!res.ok) {
        // Rollback
        setConfirmed(false);
        setCount((c) => c - 1);
      } else {
        const data = await res.json();
        setCount(data.new_confirmation_count);
      }
    } catch {
      // Rollback
      setConfirmed(false);
      setCount((c) => c - 1);
    } finally {
      setLoading(false);
    }
  }

  return { count, confirmed, loading, confirm };
}
