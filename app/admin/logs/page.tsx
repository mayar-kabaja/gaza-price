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

export default function AdminLogsPage() {
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadSearchLogs();
  }, [offset]);

  function handleApplyFilters() {
    setOffset(0);
    loadSearchLogs();
  }

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="mb-4 flex flex-wrap items-center gap-3">
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
          ) : searchLogs.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4E6070]">No search logs found</div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#243040]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-12">#</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Query</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Product</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Area</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Results</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Searched At</th>
                  </tr>
                </thead>
                <tbody>
                  {searchLogs.map((log, i) => (
                    <tr key={log.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                      <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">{offset + i + 1}</td>
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
          )}
        </div>

        {searchTotal > limit && (
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              disabled={offset === 0}
              className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-[#4E6070]">
              {offset + 1}–{Math.min(offset + limit, searchTotal)} of {searchTotal}
            </span>
            <button
              onClick={() => setOffset((o) => o + limit)}
              disabled={offset + limit >= searchTotal}
              className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
    </div>
  );
}
