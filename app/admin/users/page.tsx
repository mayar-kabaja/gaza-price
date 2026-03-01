"use client";

import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";

type Contributor = {
  id: string;
  display_handle: string | null;
  area: { id: string; name_ar: string } | null;
  trust_level: string;
  report_count: number;
  confirmation_count: number;
  is_banned: boolean;
  joined_at?: string;
  last_active_at?: string;
};

export default function AdminUsersPage() {
  const { toast } = useAdminToast();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [banningId, setBanningId] = useState<string | null>(null);
  const limit = 20;

  function load() {
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search.trim()) params.set("search", search.trim());
    fetch(`/api/admin/contributors?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setContributors(d?.contributors ?? []);
        setTotal(d?.total ?? 0);
      })
      .catch(() => toast("Failed to load", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [offset]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    load();
  }

  async function handleBan(id: string, reason?: string) {
    const token = getStoredToken();
    if (!token) return;
    setBanningId(id);
    try {
      const res = await fetch(`/api/admin/contributors/${id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reason || "Violation", hide_reports: false }),
      });
      if (res.ok) {
        toast("User banned", "success");
        setContributors((prev) => prev.map((c) => (c.id === id ? { ...c, is_banned: true } : c)));
      } else {
        const d = await res.json();
        toast(d?.message ?? "Ban failed", "error");
      }
    } catch {
      toast("Ban failed", "error");
    } finally {
      setBanningId(null);
    }
  }

  const trustLabel: Record<string, string> = {
    new: "New",
    regular: "Regular",
    trusted: "Trusted",
    verified: "Verified",
  };

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="mb-4 flex gap-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by handle..."
              className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]"
            >
              Search
            </button>
          </form>
        </div>
        <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            </div>
          ) : contributors.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4E6070]">No contributors found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#243040]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Handle</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Area</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Trust</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Reports</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Status</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contributors.map((c) => (
                    <tr key={c.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                      <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{c.display_handle ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-[#8FA3B8]">{c.area?.name_ar ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full border border-[#4A7C5935] bg-[#4A7C5920] px-2 py-0.5 text-[10px] text-[#6BA880]">
                          {trustLabel[c.trust_level] ?? c.trust_level}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-[#D8E4F0]">{c.report_count}</td>
                      <td className="px-5 py-3">
                        {c.is_banned ? (
                          <span className="text-[10px] font-medium text-[#E05A4E]">Banned</span>
                        ) : (
                          <span className="text-[10px] text-[#6BA880]">Active</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {!c.is_banned && (
                          <button
                            onClick={() => handleBan(c.id)}
                            disabled={banningId === c.id}
                            className="rounded border border-[#E05A4E30] bg-[#E05A4E18] px-2 py-1 text-[11px] text-[#E05A4E] hover:bg-[#E05A4E30] disabled:opacity-50"
                          >
                            Ban
                          </button>
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
