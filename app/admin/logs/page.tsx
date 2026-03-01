"use client";

import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth/token";

type SearchLog = {
  id: string;
  query: string;
  product?: { id: string; name_ar: string } | null;
  area?: { id: string; name_ar: string } | null;
  count_result: number;
  searched_at: string;
};

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

type Tab = "search" | "snapshots";

export default function AdminLogsPage() {
  const [tab, setTab] = useState<Tab>("search");
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [snapshots, setSnapshots] = useState<PriceSnapshot[]>([]);
  const [snapshotsTotal, setSnapshotsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 30;

  function loadSearchLogs() {
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/admin/logs/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setSearchLogs(d?.logs ?? []);
        setSearchTotal(d?.total ?? 0);
      })
      .finally(() => setLoading(false));
  }

  function loadSnapshots() {
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/admin/logs/snapshots?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setSnapshots(d?.snapshots ?? []);
        setSnapshotsTotal(d?.total ?? 0);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (tab === "search") loadSearchLogs();
    else loadSnapshots();
  }, [tab, offset]);

  function handleApplyFilters() {
    setOffset(0);
    if (tab === "search") loadSearchLogs();
    else loadSnapshots();
  }

  async function handleRunSnapshotsJob() {
    const token = getStoredToken();
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

  const total = tab === "search" ? searchTotal : snapshotsTotal;

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => { setTab("search"); setOffset(0); }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === "search" ? "bg-[#4A7C59] text-white" : "border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:text-[#D8E4F0]"
              }`}
            >
              Search Logs
            </button>
            <button
              onClick={() => { setTab("snapshots"); setOffset(0); }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === "snapshots" ? "bg-[#4A7C59] text-white" : "border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:text-[#D8E4F0]"
              }`}
            >
              Price Snapshots
            </button>
            {tab === "snapshots" && (
              <button
                onClick={handleRunSnapshotsJob}
                disabled={runningJob}
                className="rounded-lg border border-[#4A7C59] bg-[#18212C] px-4 py-2 text-sm font-medium text-[#4A7C59] hover:bg-[#4A7C59]/20 disabled:opacity-50"
              >
                {runningJob ? "Running…" : "Run snapshots now"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-[#243040] bg-[#18212C] px-3 py-1.5 text-sm text-[#D8E4F0]"
            />
            <span className="text-[#4E6070]">–</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-[#243040] bg-[#18212C] px-3 py-1.5 text-sm text-[#D8E4F0]"
            />
            <button
              onClick={handleApplyFilters}
              className="rounded-lg bg-[#4A7C59] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#3A6347]"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            </div>
          ) : tab === "search" ? (
            searchLogs.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#4E6070]">No search logs found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-[#243040]">
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Query</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Product</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Area</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Results</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Searched At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchLogs.map((log) => (
                      <tr key={log.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                        <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{log.query}</td>
                        <td className="px-5 py-3 text-xs text-[#8FA3B8]">{log.product?.name_ar ?? "—"}</td>
                        <td className="px-5 py-3 text-xs text-[#8FA3B8]">{log.area?.name_ar ?? "—"}</td>
                        <td className="px-5 py-3 font-mono text-xs">{log.count_result}</td>
                        <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">
                          {log.searched_at ? new Date(log.searched_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : snapshots.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4E6070]">
              No price snapshots. Use &quot;Run snapshots now&quot; or wait for the daily job at midnight.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#243040]">
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
                  {snapshots.map((s) => (
                    <tr key={s.id} className="border-b border-[#243040] hover:bg-[#18212C]">
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

        {total > limit && (
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              disabled={offset === 0}
              className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-[#4E6070]">
              {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <button
              onClick={() => setOffset((o) => o + limit)}
              disabled={offset + limit >= total}
              className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
    </div>
  );
}
