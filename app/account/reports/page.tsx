"use client";

import { useState } from "react";
import Link from "next/link";
import { useContributorMeReportsInfinite } from "@/lib/queries/hooks";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatRelativeTime, toArabicNumerals } from "@/lib/arabic";
import { TrustDots } from "@/components/trust/TrustDots";
import type { MyReportItem } from "@/lib/queries/fetchers";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useGlobalSidebar } from "@/components/layout/GlobalDesktopShell";

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد المراجعة",
  confirmed: "مؤكد",
  expired: "منتهي",
  flagged: "تم الإبلاغ عنه",
  rejected: "مرفوض",
};

function MyReportCard({ report }: { report: MyReportItem }) {
  const productName = report.product?.name_ar ?? "منتج قيد المراجعة";
  const productId = report.product_id ?? report.product?.id;
  const card = (
    <div
      className={cn(
        "block bg-surface rounded-2xl p-3.5 border-[1.5px] border-border",
        productId && "hover:border-olive-mid transition-colors"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-display font-bold text-sm text-ink">{productName}</span>
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full",
            report.status === "confirmed" && "bg-olive-pale text-olive",
            report.status === "pending" && "bg-amber-50 text-amber-700",
            report.status === "expired" && "bg-fog text-mist",
            (report.status === "flagged" || report.status === "rejected") && "bg-red-50 text-red-700"
          )}
        >
          {STATUS_LABELS[report.status] ?? report.status}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <div className="font-display font-extrabold text-lg text-olive">
          ₪ {report.price.toFixed(2)}
        </div>
        <div className="text-[11px] text-mist">
          {formatRelativeTime(report.reported_at)}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <TrustDots confirmations={report.confirmation_count} />
        <span className="text-[11px] text-mist">
          {toArabicNumerals(report.confirmation_count)} {report.confirmation_count === 1 ? "تأكيد" : "تأكيدات"}
        </span>
      </div>
    </div>
  );

  if (productId) {
    return (
      <Link href={`/product/${productId}`} className="block focus:outline-none">
        {card}
      </Link>
    );
  }
  return card;
}

export default function AccountReportsPage() {
  /** Default to "pending" so new prices (قيد المراجعة) show first. */
  const [status, setStatus] = useState("pending");
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useContributorMeReportsInfinite(status);

  const reports = data?.pages.flatMap((p) => p.reports) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  useEffect(() => {
    const done = localStorage.getItem(LOCAL_STORAGE_KEYS.onboarding_done);
    if (!done) {
      const t = setTimeout(() => router.replace("/onboarding"), 150);
      return () => clearTimeout(t);
    }
  }, [router]);

  useGlobalSidebar(
    isDesktop ? (
      <div className="space-y-1">
        <Link href="/account" className="flex items-center gap-1.5 text-xs text-mist hover:text-olive transition-colors font-semibold mb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          العودة لحسابي
        </Link>
        <div className="bg-olive-pale rounded-xl p-3">
          <div className="font-display font-bold text-sm text-ink mb-0.5">مساهماتي</div>
          <div className="text-[11px] text-mist">
            {toArabicNumerals(total)} مساهمة
          </div>
        </div>
      </div>
    ) : null
  );

  const statusFilters = [
    { val: "pending", label: "قيد المراجعة" },
    { val: "confirmed", label: "مؤكد" },
    { val: "expired", label: "منتهي" },
    { val: "all", label: "الكل" },
  ];

  const reportsList = (
    <>
      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 font-body">
          {(error as { data?: { message?: string } })?.data?.message ?? "حدث خطأ"}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl p-3.5 border border-border animate-pulse">
              <div className="h-4 bg-fog rounded w-3/4 mb-2" />
              <div className="h-3 bg-fog rounded w-1/2 mb-2" />
              <div className="h-5 bg-fog rounded w-1/4 mb-2" />
              <div className="h-3 bg-fog rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isError && reports.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-fog/30 p-8 text-center">
          {status === "all" ? (
            <>
              <p className="font-display font-bold text-ink mb-1">لا توجد مساهمات بعد</p>
              <p className="text-sm text-mist mb-3">ابدأ بإضافة سعر أو اقتراح منتج جديد</p>
              <Link
                href="/submit"
                className="inline-block bg-olive-pale border border-olive-mid rounded-full px-4 py-2 text-sm font-semibold text-olive font-body"
              >
                ➕ أضف سعرك أو اقترح منتجاً
              </Link>
            </>
          ) : (
            <>
              <p className="font-display font-bold text-ink mb-1">
                لا توجد مساهمات {status === "pending" ? "قيد المراجعة" : status === "confirmed" ? "مؤكدة" : "منتهية"}
              </p>
              <p className="text-sm text-mist mb-3">
                جرّب فلتر «الكل» لعرض كل مساهماتك
              </p>
              <button
                type="button"
                onClick={() => setStatus("all")}
                className="inline-block bg-olive-pale border border-olive-mid rounded-full px-4 py-2 text-sm font-semibold text-olive font-body"
              >
                عرض الكل
              </button>
            </>
          )}
        </div>
      )}

      {!isLoading && !isError && reports.length > 0 && (
        <div className="space-y-2">
          {reports.map((report) => (
            <MyReportCard key={report.id} report={report} />
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
      )}
    </>
  );

  // ── Desktop layout ──
  if (isDesktop) {
    return (
      <div className="h-full overflow-y-auto bg-fog" dir="rtl">
        <div className="max-w-2xl mx-auto p-6">
          {/* Header */}
          <div className="mb-5">
            <h1 className="font-display font-bold text-lg text-ink">مساهماتي</h1>
            <p className="text-sm text-mist mt-0.5">
              أسعاري والمنتجات التي اقترحتها ({toArabicNumerals(total)})
            </p>
          </div>

          {/* Status filter */}
          <div className="flex gap-2 mb-5">
            {statusFilters.map(({ val, label }) => (
              <button
                key={val}
                type="button"
                onClick={() => setStatus(val)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-body font-medium shrink-0 transition-colors",
                  status === val
                    ? "bg-olive text-white"
                    : "bg-surface border border-border text-ink hover:border-olive-mid"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* List */}
          {reportsList}
        </div>
      </div>
    );
  }

  // ── Mobile layout ──
  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <div className="px-5 pt-4 pb-5 flex-shrink-0" style={{ background: "#1A1F2E" }}>
        <div className="flex items-center gap-3 mb-1">
          <Link href="/account" className="text-white/60 hover:text-white font-body text-sm">
            ←
          </Link>
          <div className="font-display font-extrabold text-xl text-white leading-none">
            غزة <span className="text-sand">بريس</span>
          </div>
        </div>
        <h1 className="font-display font-bold text-lg text-white mt-2">مساهماتي</h1>
        <p className="text-sm text-white/70 mt-0.5 font-body">
          أسعاري والمنتجات التي اقترحتها ({toArabicNumerals(total)})
        </p>
      </div>

      {/* Status filter */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0 bg-fog/30 flex gap-2 overflow-x-auto no-scrollbar">
        {statusFilters.map(({ val, label }) => (
          <button
            key={val}
            type="button"
            onClick={() => setStatus(val)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-body font-medium shrink-0 transition-colors",
              status === val
                ? "bg-olive text-white"
                : "bg-surface border border-border text-ink hover:border-olive-mid"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {reportsList}
      </div>

      <BottomNav />
    </div>
  );
}
