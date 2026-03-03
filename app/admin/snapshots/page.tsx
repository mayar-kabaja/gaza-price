"use client";

import { useEffect, useState } from "react";
import { getAdminToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";
import { AdminDateRangePicker } from "@/components/admin/AdminDateRangePicker";
import { validateDateRange, DATE_RANGE_MESSAGES } from "@/lib/admin/date-utils";

type PriceSnapshot = {
  id: string;
  product?: { id: string; name_ar: string } | null;
  area?: { id: string; name_ar: string } | null;
  snapshot_date: string;
  avg_price: number | null;
  median_price: number | null;
  min_price: number | null;
  max_price: number | null;
  count_report: number;
  store_count: number;
  currency: string;
};

export default function AdminSnapshotsPage() {
  const { toast } = useAdminToast();
  const [snapshots, setSnapshots] = useState<PriceSnapshot[]>([]);
  const [snapshotsTotal, setSnapshotsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 30;

  function loadSnapshots() {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (from?.trim()) params.set("from", from.trim());
    if (to?.trim()) params.set("to", to.trim());
    fetch(`/api/admin/logs/snapshots?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          toast(d?.message ?? "فشل تحميل اللقطات", "error");
          setSnapshots([]);
          setSnapshotsTotal(0);
          return;
        }
        setSnapshots(d?.snapshots ?? []);
        setSnapshotsTotal(d?.total ?? 0);
      })
      .catch(() => toast("فشل تحميل اللقطات", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (from?.trim() || to?.trim()) {
      const err = validateDateRange(from, to);
      if (err) return;
    }
    loadSnapshots();
  }, [offset]);

  function handleApplyFilters() {
    const err = validateDateRange(from, to);
    if (err) {
      toast(DATE_RANGE_MESSAGES[err], "error");
      return;
    }
    setOffset(0);
    loadSnapshots();
  }

  async function handleRunSnapshotsJob() {
    const token = getAdminToken();
    if (!token) return;
    setRunningJob(true);
    try {
      const res = await fetch("/api/admin/jobs/run-snapshots", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.created != null) {
        setOffset(0);
        loadSnapshots();
      }
    } finally {
      setRunningJob(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="mb-4 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <div className="flex flex-nowrap items-center gap-2 min-w-0">
            <div className="flex-1 min-w-0 max-w-[280px]">
              <AdminDateRangePicker
                from={from}
                to={to}
                onChange={(f, t) => {
                  setFrom(f);
                  setTo(t);
                }}
                placeholder="From – To"
              />
            </div>
            <button
              onClick={handleApplyFilters}
              className="flex-shrink-0 min-h-[36px] rounded-lg bg-[#4A7C59] px-3 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#3A6347] transition-colors"
            >
              Apply
            </button>
          </div>
          <button
            onClick={handleRunSnapshotsJob}
            disabled={runningJob}
            className="flex-shrink-0 rounded-lg border border-[#4A7C59] bg-[#18212C] px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-[#4A7C59] hover:bg-[#4A7C59]/20 disabled:opacity-50"
          >
            {runningJob ? "Running…" : "Run snapshots now"}
          </button>
        </div>

        <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            </div>
          ) : snapshots.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4E6070]">
              No price snapshots. Use &quot;Run snapshots now&quot; or wait for the daily job at midnight.
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-[#243040]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-12">#</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Product</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Area</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Date</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Avg</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Median</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Min–Max</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s, i) => (
                    <tr key={s.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                      <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">{offset + i + 1}</td>
                      <td className="px-5 py-3 text-sm text-[#D8E4F0]">{s.product?.name_ar ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-[#8FA3B8]">{s.area?.name_ar ?? "—"}</td>
                      <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">{s.snapshot_date}</td>
                      <td className="px-5 py-3 font-mono text-xs">₪ {s.avg_price ?? "—"}</td>
                      <td className="px-5 py-3 font-mono text-xs">₪ {s.median_price ?? "—"}</td>
                      <td className="px-5 py-3 font-mono text-xs">
                        {s.min_price != null && s.max_price != null ? `₪ ${s.min_price}–${s.max_price}` : "—"}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{s.count_report}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {snapshotsTotal > limit && (
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              disabled={offset === 0}
              className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-[#4E6070]">
              {offset + 1}–{Math.min(offset + limit, snapshotsTotal)} of {snapshotsTotal}
            </span>
            <button
              onClick={() => setOffset((o) => o + limit)}
              disabled={offset + limit >= snapshotsTotal}
              className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
    </div>
  );
}
