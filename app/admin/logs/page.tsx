"use client";

import { useEffect, useState } from "react";
import { getAdminToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";
import { AdminDateRangePicker } from "@/components/admin/AdminDateRangePicker";
import { validateDateRange, DATE_RANGE_MESSAGES } from "@/lib/admin/date-utils";

type SearchLog = {
  id: string;
  query: string;
  product?: { id: string; name_ar: string } | null;
  area?: { id: string; name_ar: string } | null;
  count_result: number;
  searched_at: string;
};

export default function AdminLogsPage() {
  const { toast } = useAdminToast();
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 30;

  function loadSearchLogs() {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (from?.trim()) params.set("from", from.trim());
    if (to?.trim()) params.set("to", to.trim());
    fetch(`/api/admin/logs/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          toast(d?.message ?? "فشل تحميل السجلات", "error");
          setSearchLogs([]);
          setSearchTotal(0);
          return;
        }
        setSearchLogs(d?.logs ?? []);
        setSearchTotal(d?.total ?? 0);
      })
      .catch(() => toast("فشل تحميل السجلات", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (from?.trim() || to?.trim()) {
      const err = validateDateRange(from, to);
      if (err) return;
    }
    loadSearchLogs();
  }, [offset]);

  function handleApplyFilters() {
    const err = validateDateRange(from, to);
    if (err) {
      toast(DATE_RANGE_MESSAGES[err], "error");
      return;
    }
    setOffset(0);
    loadSearchLogs();
  }

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="mb-4 flex flex-nowrap items-center gap-2 min-w-0">
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

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full min-w-[480px]">
                <thead className="sticky top-0 bg-[#111820] z-10">
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
                  {searchLogs.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-sm text-[#4E6070]">No search logs found</td></tr>
                  ) : searchLogs.map((log, i) => (
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
