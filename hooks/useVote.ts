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

export type VoteState = "confirm" | "flag" | null;

export function useVote(
  priceId: string,
  options?: {
    initialVote?: VoteState;
    initialConfirmCount?: number;
    initialFlagCount?: number;
    onSuccess?: (vote: VoteState, counts: { confirmation_count: number; flag_count: number }) => void;
  }
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [myVote, setMyVote] = useState<VoteState>(() => options?.initialVote ?? null);
  const [confirmCount, setConfirmCount] = useState(() => options?.initialConfirmCount ?? 0);
  const [flagCount, setFlagCount] = useState(() => options?.initialFlagCount ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSuccessRef = useRef(options?.onSuccess);
  useEffect(() => {
    onSuccessRef.current = options?.onSuccess;
  }, [options?.onSuccess]);

  // Sync with server data when props change (e.g. after refetch)
  useEffect(() => {
    setMyVote(options?.initialVote ?? null);
  }, [options?.initialVote]);

  useEffect(() => {
    setConfirmCount(options?.initialConfirmCount ?? 0);
  }, [options?.initialConfirmCount]);

  useEffect(() => {
    setFlagCount(options?.initialFlagCount ?? 0);
  }, [options?.initialFlagCount]);

  async function vote(type: "confirm" | "flag") {
    if (loading) return;
    if (!priceId) return;

    const prevVote = myVote;
    const prevConfirm = confirmCount;
    const prevFlag = flagCount;

    setError(null);
    setLoading(true);

    // Optimistic update — 3 cases
    const isSameVote = prevVote === type;
    const isSwitch = prevVote !== null && prevVote !== type;

    if (isSameVote) {
      // Toggle off
      setMyVote(null);
      if (type === "confirm") setConfirmCount((c) => Math.max(0, c - 1));
      else setFlagCount((c) => Math.max(0, c - 1));
    } else if (isSwitch) {
      // Switch vote
      setMyVote(type);
      if (prevVote === "confirm") {
        setConfirmCount((c) => Math.max(0, c - 1));
        setFlagCount((c) => c + 1);
      } else {
        setFlagCount((c) => Math.max(0, c - 1));
        setConfirmCount((c) => c + 1);
      }
    } else {
      // New vote
      setMyVote(type);
      if (type === "confirm") setConfirmCount((c) => c + 1);
      else setFlagCount((c) => c + 1);
    }

    try {
      const res = await apiFetch(`/api/prices/${priceId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote_type: type }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Rollback
        setMyVote(prevVote);
        setConfirmCount(prevConfirm);
        setFlagCount(prevFlag);
        playSound("error");
        handleApiError(res, data as ApiErrorResponse, setError, router);
        return;
      }

      if (typeof data?.access_token === "string") {
        setStoredToken(data.access_token);
      }

      // Sync with server values
      const serverVote = data?.my_vote ?? null;
      setMyVote(serverVote);
      if (typeof data?.confirmation_count === "number") setConfirmCount(data.confirmation_count);
      if (typeof data?.flag_count === "number") setFlagCount(data.flag_count);

      gtagEvent({
        action: type === "confirm" ? "confirm_price" : "flag_price",
        category: "engagement",
        label: priceId,
      });

      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["prices"] });

      onSuccessRef.current?.(serverVote, {
        confirmation_count: data?.confirmation_count ?? confirmCount,
        flag_count: data?.flag_count ?? flagCount,
      });
    } catch {
      // Rollback
      setMyVote(prevVote);
      setConfirmCount(prevConfirm);
      setFlagCount(prevFlag);
      playSound("error");
      setError("حدث خطأ غير متوقع، جرّب مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return { myVote, confirmCount, flagCount, loading, error, setError, vote };
}
