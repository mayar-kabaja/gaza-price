"use client";

import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth/token";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useAdminHeader } from "@/components/admin/AdminLayout";

type PendingProduct = {
  id: string;
  name_ar: string;
  unit?: string;
  unit_size?: number;
  category?: { name_ar: string };
  suggested_by_handle?: string;
  pending_price?: number;
  created_at?: string;
};

type FlaggedReport = {
  id: string;
  price: number;
  product?: { name_ar: string };
  flag_count: number;
  flags?: { reason?: string; flagged_at?: string }[];
  reported_at?: string;
};

type Stats = {
  reports_today?: number;
  pending_products?: number;
  flagged_count?: number;
  active_contributors?: number;
  submission_volume?: number[];
  top_categories?: { id: string; name_ar: string; icon: string | null; count: number }[];
  top_contributors?: { id: string; display_handle: string | null; area: { name_ar: string } | null; report_count: number }[];
  regional_coverage?: { id: string; name_ar: string; count: number }[];
};

export default function AdminDashboardPage() {
  const { toast } = useAdminToast();
  const [stats, setStats] = useState<Stats>({});
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [flaggedReports, setFlaggedReports] = useState<FlaggedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  function load() {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch("/api/admin/products/pending?limit=6&offset=0", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch("/api/admin/flags?limit=5&offset=0", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ]).then(([statsData, pendingData, flagsData]) => {
      setStats(statsData);
      setPendingProducts(pendingData?.products ?? []);
      setFlaggedReports(flagsData?.reports ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  const { setRight } = useAdminHeader();

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setRight(
      <>
        <div className="flex items-center gap-1.5 rounded-full border border-[#4A7C5935] bg-[#4A7C5920] px-3 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[#6BA880] animate-pulse" />
          <span className="text-[11px] font-medium text-[#6BA880]">Live · Data syncing</span>
        </div>
        <div className="flex h-[34px] w-[220px] items-center gap-2 rounded-lg border border-[#243040] bg-[#18212C] px-3">
          <svg width={13} height={13} fill="none" stroke="#4E6070" viewBox="0 0 24 24" className="flex-shrink-0">
            <circle cx={11} cy={11} r={8} strokeWidth={1.7} />
            <path d="M21 21l-4.35-4.35" strokeWidth={1.7} />
          </svg>
          <input
            type="text"
            placeholder="Search products, categories…"
            className="flex-1 bg-transparent text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none"
          />
        </div>
      </>
    );
    return () => setRight(null);
  }, [setRight]);

  async function handleReview(id: string, action: "approve" | "reject") {
    const token = getStoredToken();
    if (!token) return;
    setReviewingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast(action === "approve" ? "Product approved" : "Product rejected", "success");
        setPendingProducts((prev) => prev.filter((p) => p.id !== id));
        setStats((s) => ({ ...s, pending_products: Math.max(0, (s.pending_products ?? 0) - 1) }));
      } else {
        toast("Action failed", "error");
      }
    } catch {
      toast("Action failed", "error");
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5 flex-1 min-h-0">
      {loading ? (
        <div className="flex flex-1 items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            <span className="text-sm text-[#4E6070]">Loading dashboard…</span>
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 max-[380px]:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { label: "Price Reports Today", value: String(stats.reports_today ?? "—"), icon: "📊", color: "olive", delta: "Today" },
            { label: "Pending Review", value: String(stats.pending_products ?? "—"), icon: "⏳", color: "sand", delta: "Awaiting verification" },
            { label: "Flagged Reports", value: String(stats.flagged_count ?? "—"), icon: "⚠️", color: "red", delta: "Requires attention" },
            { label: "Active Contributors", value: String(stats.active_contributors ?? "—"), icon: "👥", color: "sky", delta: "This week" },
          ].map((s) => (
            <div
              key={s.label}
              className={`admin-stat-card relative overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820] max-sm:py-[14px] max-sm:px-4 sm:p-5 transition-colors hover:border-[#2E3D50] ${s.color === "olive" ? "admin-stat-card olive" : ""} ${s.color === "sand" ? "admin-stat-card sand" : ""} ${s.color === "red" ? "admin-stat-card red" : ""} ${s.color === "sky" ? "admin-stat-card sky" : ""}`}
              style={{ ["--tw-gradient" as string]: "none" }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5" />
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#4E6070]">{s.label}</span>
                <span className="text-sm">{s.icon}</span>
              </div>
              <div className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#D8E4F0] mb-2 font-mono">{s.value}</div>
              <div className="text-[11px] text-[#4E6070]">{s.delta}</div>
            </div>
          ))}
        </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_360px]">
          {/* Suggestions table */}
          <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
            <div className="flex items-center justify-between border-b border-[#243040] px-5 py-4">
              <div>
                <div className="text-[13px] font-semibold text-[#D8E4F0]">Recent Suggestions</div>
                <div className="text-[11px] text-[#4E6070] mt-0.5">Product suggestions · {stats.pending_products ?? pendingProducts.length} pending</div>
              </div>
              <Link
                href="/admin/suggestions"
                className="rounded-md border border-[#4A7C5930] bg-[#4A7C5920] px-2.5 py-1 text-[11px] font-medium text-[#6BA880] hover:bg-[#4A7C5930] transition-colors"
              >
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              {pendingProducts.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#4E6070]">No pending suggestions</div>
              ) : (
                <table className="w-full min-w-[480px] text-left">
                  <thead>
                    <tr className="border-b border-[#243040]">
                      <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Product</th>
                      <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Suggested</th>
                      <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Status</th>
                      <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingProducts.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-[#243040] transition-colors hover:bg-[#18212C] cursor-pointer"
                      >
                        <td className="px-5 py-3">
                          <div>
                            <div className="text-xs font-medium text-[#D8E4F0]">{p.name_ar}</div>
                            <div className="text-[10px] text-[#4E6070]">{p.category?.name_ar ?? "—"}</div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs font-medium text-[#D8E4F0]">
                            {p.pending_price != null ? `₪ ${p.pending_price}` : "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#D4913A30] bg-[#D4913A18] px-2 py-0.5 text-[10px] font-semibold text-[#D4913A]">
                            ● Pending
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleReview(p.id, "approve")}
                              disabled={reviewingId === p.id}
                              className="rounded border border-[#4A7C59] bg-[#4A7C5920] px-2.5 py-1 text-[11px] text-[#6BA880] hover:bg-[#4A7C5930] disabled:opacity-50"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleReview(p.id, "reject")}
                              disabled={reviewingId === p.id}
                              className="rounded border border-[#E05A4E30] bg-[#E05A4E18] px-2.5 py-1 text-[11px] text-[#E05A4E] hover:bg-[#E05A4E30] disabled:opacity-50"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Flags */}
          <div className="flex flex-col gap-3.5">
            <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
              <div className="flex items-center justify-between border-b border-[#243040] px-5 py-4">
                <div>
                  <div className="text-[13px] font-semibold text-[#D8E4F0]">Flagged Reports</div>
                  <div className="text-[11px] text-[#4E6070] mt-0.5">Requires attention</div>
                </div>
                <Link
                  href="/admin/flags"
                  className="rounded-md border border-[#4A7C5930] bg-[#4A7C5920] px-2.5 py-1 text-[11px] font-medium text-[#6BA880] hover:bg-[#4A7C5930] transition-colors"
                >
                  All flags
                </Link>
              </div>
              <div className="divide-y divide-[#243040]">
                {(stats.flagged_count ?? 0) > 0 && (
                  <div className="flex items-start gap-3 px-5 py-3 hover:bg-[#18212C] cursor-pointer transition-colors">
                    <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#E05A4E]" />
                    <div>
                      <div className="text-xs text-[#D8E4F0]">{stats.flagged_count} flagged reports need review</div>
                      <div className="mt-0.5 text-[10px] font-mono text-[#4E6070]">Flagged by users</div>
                    </div>
                  </div>
                )}
                {(stats.pending_products ?? 0) > 0 && (
                  <div className="flex items-start gap-3 px-5 py-3 hover:bg-[#18212C] cursor-pointer transition-colors">
                    <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#4A7C59]" />
                    <div>
                      <div className="text-xs text-[#D8E4F0]">{stats.pending_products} product suggestions queued</div>
                      <div className="mt-0.5 text-[10px] font-mono text-[#4E6070]">Ongoing</div>
                    </div>
                  </div>
                )}
                {(stats.flagged_count ?? 0) === 0 && (stats.pending_products ?? 0) === 0 && (
                  <div className="px-5 py-8 text-center text-xs text-[#4E6070]">No flagged reports</div>
                )}
              </div>
            </div>

            {/* Submission Volume - Last 7 days */}
            <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
              <div className="border-b border-[#243040] px-5 py-4">
                <div className="text-[13px] font-semibold text-[#D8E4F0]">Submission Volume</div>
                <div className="text-[11px] text-[#4E6070] mt-0.5">Last 7 days · Price reports submitted</div>
              </div>
              <div className="p-5">
                <div className="flex items-end gap-1.5 mb-2.5 h-[140px]">
                  {(stats.submission_volume ?? [0, 0, 0, 0, 0, 0, 0]).map((count, i) => {
                    const max = Math.max(1, ...(stats.submission_volume ?? [1]));
                    const pct = Math.round((count / max) * 100);
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t min-h-[4px] bg-[#4A7C59] transition-opacity hover:opacity-80"
                        style={{ height: `${Math.max(4, pct)}%` }}
                        title={`${label}: ${count} reports`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  {(stats.submission_volume ?? [0, 0, 0, 0, 0, 0, 0]).map((count, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
                    return (
                      <span key={i} className="text-[9px] text-[#4E6070] flex-1 text-center truncate" title={`${count} reports`}>
                        {label}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-[#4E6070]">
                  <div className="h-2 w-2 rounded-sm bg-[#4A7C59]" />
                  Submitted
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Bottom row - Top Categories, Contributors, Regional Coverage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
            <div className="flex items-center justify-between border-b border-[#243040] px-5 py-4">
              <div className="text-[13px] font-semibold text-[#D8E4F0]">Top Categories</div>
              <Link href="/admin/categories" className="text-[11px] font-medium text-[#6BA880] hover:underline cursor-pointer">
                Manage
              </Link>
            </div>
            <div className="divide-y divide-[#243040]">
              {(stats.top_categories ?? []).length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-[#4E6070]">No categories with reports yet</div>
              ) : (
                (stats.top_categories ?? []).map((c) => {
                  const max = Math.max(1, ...(stats.top_categories ?? []).map((x) => x.count));
                  const pct = max > 0 ? Math.round((c.count / max) * 100) : 0;
                  return (
                    <div key={c.id} className="flex items-center justify-between px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{c.icon || "📦"}</span>
                        <div>
                          <div className="text-xs font-medium text-[#D8E4F0]">{c.name_ar}</div>
                          <div className="text-[10px] text-[#4E6070]">{c.count} reports</div>
                        </div>
                      </div>
                      <div className="h-1 w-20 overflow-hidden rounded bg-[#1E2B38]">
                        <div
                          className="h-full rounded bg-gradient-to-r from-[#4A7C59] to-[#6BA880]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
            <div className="flex items-center justify-between border-b border-[#243040] px-5 py-4">
              <div className="text-[13px] font-semibold text-[#D8E4F0]">Top Contributors</div>
              <Link href="/admin/users" className="text-[11px] font-medium text-[#6BA880] hover:underline cursor-pointer">
                All Users
              </Link>
            </div>
            <div className="divide-y divide-[#243040]">
              {(stats.top_contributors ?? []).length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-[#4E6070]">No contributors yet</div>
              ) : (
                (stats.top_contributors ?? []).map((u, i) => (
                  <Link key={u.id} href={`/admin/users`} className="flex items-center gap-2.5 px-5 py-2.5 hover:bg-[#18212C] cursor-pointer block">
                    <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{
                        background: i === 0 ? "linear-gradient(135deg,#4A7C59,#6BA880)" : i === 1 ? "linear-gradient(135deg,#C9A96E,#E8C98A)" : "linear-gradient(135deg,#4A9FD4,#7AC4F0)",
                        color: i === 1 ? "#1a1a1a" : "white",
                      }}
                    >
                      {(u.display_handle || "An").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[#D8E4F0]">{u.display_handle || "Anonymous"}</div>
                      <div className="text-[10px] text-[#4E6070]">{u.area?.name_ar ?? "—"}</div>
                    </div>
                    <div className="text-xs font-semibold text-[#C9A96E] font-mono">{u.report_count}</div>
                  </Link>
                ))
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
            <div className="flex items-center justify-between border-b border-[#243040] px-5 py-4">
              <div className="text-[13px] font-semibold text-[#D8E4F0]">Regional Coverage</div>
              <Link href="/admin/areas-stores" className="text-[11px] font-medium text-[#6BA880] hover:underline cursor-pointer">
                Map View
              </Link>
            </div>
            <div className="divide-y divide-[#243040]">
              {(stats.regional_coverage ?? []).length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-[#4E6070]">No regional data yet</div>
              ) : (
                (stats.regional_coverage ?? []).map((r) => {
                  const max = Math.max(1, ...(stats.regional_coverage ?? []).map((x) => x.count));
                  const pct = max > 0 ? Math.round((r.count / max) * 100) : 0;
                  return (
                    <div key={r.id} className="px-5 py-2.5">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-medium text-[#D8E4F0]">{r.name_ar}</span>
                        <span className="text-[11px] text-[#8FA3B8] font-mono">{r.count} reports</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded bg-[#1E2B38]">
                        <div
                          className="h-full rounded bg-gradient-to-r from-[#C9A96E] to-[#E8C98A]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
