"use client";

import { ReportCard } from "./ReportCard";
import type { ReportFilterValue } from "./ReportFilters";
import { useReportsInfinite } from "@/lib/queries/hooks";

interface ReportFeedProps {
  filter: ReportFilterValue;
  areaId: string | null;
}

export function ReportFeed({ filter, areaId }: ReportFeedProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useReportsInfinite(filter, areaId);

  const reports = data?.pages?.flatMap((p) => p.reports) ?? [];

  if (isError) {
    const errObj = error as { data?: { message?: string } } | Error | undefined;
    const message =
      errObj && typeof errObj === "object" && "data" in errObj && errObj.data?.message
        ? errObj.data.message
        : error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع";
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 font-body">
        {message}
      </div>
    );
  }

  if (isLoading) {
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
      {hasNextPage && (
        <div className="py-4 flex justify-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-5 py-2.5 rounded-xl bg-olive-pale border border-olive-mid text-olive text-sm font-body font-medium disabled:opacity-50"
          >
            {isFetchingNextPage ? "جاري التحميل..." : "تحميل المزيد"}
          </button>
        </div>
      )}
    </div>
  );
}
