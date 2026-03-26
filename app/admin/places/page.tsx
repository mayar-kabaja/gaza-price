"use client";

import { useState } from "react";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useAdminPlaces } from "@/lib/queries/hooks";

const PAGE_SIZE = 20;

export default function AdminPlacesPage() {
  const { toast } = useAdminToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const { data, isLoading } = useAdminPlaces(statusFilter, PAGE_SIZE, offset);
  const places = data?.data ?? [];
  const total = data?.total ?? 0;

  function openDashboard(token: string) {
    const base = window.location.hostname === "localhost"
      ? `${window.location.origin}`
      : "https://gazaprice.com";
    window.open(`${base}/places/dashboard?token=${token}`, "_blank");
  }

  const filteredPlaces = search.trim()
    ? places.filter(
        (p) =>
          p.name.toLowerCase().includes(search.trim().toLowerCase()) ||
          (p.area?.name_ar ?? "").includes(search.trim()) ||
          (p.phone ?? "").includes(search.trim()) ||
          (p.type ?? "").toLowerCase().includes(search.trim().toLowerCase())
      )
    : places;

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: "bg-[#4A7C5920] border-[#4A7C5935]", text: "text-[#6BA880]", label: "Active" },
      pending: { bg: "bg-[#C9A96E20] border-[#C9A96E35]", text: "text-[#C9A96E]", label: "Pending" },
      suspended: { bg: "bg-[#A8585218] border-[#A8585235]", text: "text-[#D49088]", label: "Suspended" },
    };
    const s = map[status] ?? { bg: "bg-[#334155] border-[#64748B35]", text: "text-[#94A3B8]", label: status };
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="mb-2 flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search places..."
          className="flex-1 min-w-[180px] rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
          className="rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
        <span className="text-xs text-[#4E6070]">{total} total</span>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#4E6070]">
            {search.trim() ? "No places match your search." : "No places"}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-[#243040] sticky top-0 bg-[#111820] z-10">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-10">#</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Place</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Type</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Area</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Status</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Open</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Owner Dashboard</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlaces.map((p, i) => (
                  <tr key={p.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                    <td className="px-4 py-3 text-[10px] font-mono text-[#4E6070]">{offset + i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-[#D8E4F0]">{p.name}</div>
                      {p.phone && <div className="text-[10px] text-[#4E6070] mt-0.5 font-mono">{p.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-[#243040] bg-[#18212C] px-2 py-0.5 text-[10px] font-medium text-[#8FA3B8]">
                        {p.section === "food" ? "🍽" : "🏪"} {p.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#8FA3B8]">{p.area?.name_ar ?? "—"}</td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${p.is_open ? "text-[#6BA880]" : "text-[#D49088]"}`}>
                        {p.is_open ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.owner_token ? (
                        <button
                          onClick={() => openDashboard(p.owner_token!)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#243040] bg-[#18212C] px-3 py-1.5 text-xs font-medium text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] transition-colors"
                        >
                          <svg fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                          Open
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#4E6070]">No token</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            className="rounded-lg border border-[#243040] px-3 py-1.5 text-xs text-[#8FA3B8] hover:bg-[#18212C] disabled:opacity-30"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setOffset((page - 1) * PAGE_SIZE)}
                className={`min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors ${
                  page === currentPage
                    ? "bg-[#4A7C59] text-white"
                    : "text-[#8FA3B8] hover:bg-[#18212C]"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total}
            className="rounded-lg border border-[#243040] px-3 py-1.5 text-xs text-[#8FA3B8] hover:bg-[#18212C] disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
