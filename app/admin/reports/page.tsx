"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Report = {
  id: string;
  product_id?: string;
  product?: { id?: string; name_ar?: string };
  price?: number;
  status?: string;
  area?: { name_ar?: string };
  confirmation_count?: number;
  reported_at?: string;
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ filter, limit: String(limit), offset: String(offset) });
    fetch(`/api/reports?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setReports(d?.reports ?? []);
        setTotal(d?.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [filter, offset]);

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="mb-4 flex gap-2">
          {(["all", "today", "trusted"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setOffset(0); }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-[#4A7C59] text-white"
                  : "border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:text-[#D8E4F0]"
              }`}
            >
              {f === "all" ? "All" : f === "today" ? "Today" : "Trusted"}
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4E6070]">No reports</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#243040]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Product</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Price</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Area</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Status</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Confirmations</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">View</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                      <td className="px-5 py-3 text-sm text-[#D8E4F0]">{r.product?.name_ar ?? "—"}</td>
                      <td className="px-5 py-3 font-mono text-xs">₪ {r.price ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-[#8FA3B8]">{r.area?.name_ar ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                          r.status === "confirmed" ? "bg-[#4A7C5920] text-[#6BA880]" : "bg-[#D4913A18] text-[#D4913A]"
                        }`}>
                          {r.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{r.confirmation_count ?? 0}</td>
                      <td className="px-5 py-3">
                        {r.product_id && (
                          <Link href={`/product/${r.product_id}`} target="_blank" className="text-[11px] text-[#6BA880] hover:underline">
                            View
                          </Link>
                        )}
                      </td>
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
