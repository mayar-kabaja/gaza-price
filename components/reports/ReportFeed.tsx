"use client";

import { useState, useEffect, useCallback } from "react";
import { ReportCard } from "./ReportCard";
import type { ReportFeedItem } from "@/types/app";
import type { ReportFilterValue } from "./ReportFilters";
import { useSession } from "@/hooks/useSession";
import { apiFetch } from "@/lib/api/fetch";

const PAGE_SIZE = 20;

interface ReportFeedProps {
  filter: ReportFilterValue;
  areaId: string | null;
}

interface ReportsResponse {
  reports: ReportFeedItem[];
  total: number;
  next_offset: number | null;
}

export function ReportFeed({ filter, areaId }: ReportFeedProps) {
  useSession(); // subscribe to session so token refresh (e.g. from apiFetch) updates state
  const [reports, setReports] = useState<ReportFeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      const params = new URLSearchParams();
      params.set("filter", filter === "my_area" ? "all" : filter);
      if (filter === "my_area" && areaId) params.set("area_id", areaId);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));

      const res = await apiFetch(`/api/reports?${params.toString()}`, {
        credentials: "include",
      });
      const data = (await res.json()) as ReportsResponse | { error?: string; message?: string };

      if (!res.ok) {
        const err = data && typeof data === "object" && "message" in data ? (data.message as string) : "حدث خطأ غير متوقع";
        setError(err);
        return;
      }

      const payload = data as ReportsResponse;
      setReports((prev) => (append ? [...prev, ...payload.reports] : payload.reports));
      setTotal(payload.total);
      setNextOffset(payload.next_offset);
      setError(null);
    },
    [filter, areaId]
  );

  useEffect(() => {
    setLoading(true);
    setReports([]);
    setNextOffset(0);
    fetchPage(0, false).finally(() => setLoading(false));
  }, [fetchPage]);

  async function loadMore() {
    if (nextOffset == null || loadingMore) return;
    setLoadingMore(true);
    await fetchPage(nextOffset, true);
    setLoadingMore(false);
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 font-body">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-3.5 border border-border animate-pulse">
            <div className="h-4 bg-fog rounded w-3/4 mb-2" />
            <div className="h-3 bg-fog rounded w-1/2 mb-2" />
            <div className="h-5 bg-fog rounded w-1/4 mb-2" />
            <div className="h-3 bg-fog rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border bg-fog/30 p-8 text-center">
        <p className="font-display font-bold text-ink mb-1">لا توجد تقارير في هذه المنطقة بعد</p>
        <a
          href="/submit"
          className="inline-block mt-3 bg-olive-pale border border-olive-mid rounded-full px-4 py-2 text-sm font-semibold text-olive font-body"
        >
          ➕ كن أول من يضيف سعراً
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
      {nextOffset != null && (
        <div className="py-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="px-5 py-2.5 rounded-xl bg-olive-pale border border-olive-mid text-olive text-sm font-body font-medium disabled:opacity-50"
          >
            {loadingMore ? "جاري التحميل..." : "تحميل المزيد"}
          </button>
        </div>
      )}
    </div>
  );
}
