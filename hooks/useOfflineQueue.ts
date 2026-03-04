"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getPendingReports,
  getPendingCount,
  removeReport,
  type QueuedReport,
} from "@/lib/offline/queue";
import { apiFetch } from "@/lib/api/fetch";

const SYNC_INTERVAL_MS = 30_000;

export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);
  const queryClient = useQueryClient();

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB unavailable
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    if (!navigator.onLine) return;

    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const reports = await getPendingReports();
      if (reports.length === 0) {
        setIsSyncing(false);
        syncingRef.current = false;
        return;
      }

      let synced = false;

      for (const report of reports) {
        try {
          const { id, queued_at, product_name_ar, ...body } = report;
          const res = await apiFetch("/api/reports", {
            method: "POST",
            body: JSON.stringify(body),
          });

          if (res.ok) {
            await removeReport(id!);
            synced = true;
          } else if (res.status >= 400 && res.status < 500) {
            // Client error — bad data won't fix itself, discard
            await removeReport(id!);
            synced = true;
          }
          // 5xx → keep in queue for later retry
        } catch {
          // Network error — keep in queue
        }
      }

      if (synced) {
        queryClient.invalidateQueries({ queryKey: ["prices"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["reports"] });
        queryClient.invalidateQueries({ queryKey: ["contributors", "me"] });
      }
    } finally {
      await refreshCount();
      setIsSyncing(false);
      syncingRef.current = false;
    }
  }, [queryClient, refreshCount]);

  // Read initial count
  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // Listen to online event
  useEffect(() => {
    const handleOnline = () => {
      syncNow();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncNow]);

  // Periodic retry every 30s
  useEffect(() => {
    const id = setInterval(() => {
      if (navigator.onLine) syncNow();
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [syncNow]);

  return { pendingCount, syncNow, isSyncing, refreshCount };
}
