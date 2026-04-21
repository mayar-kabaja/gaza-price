"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useAdminHeader } from "@/components/admin/AdminLayout";
import {
  useAdminStats,
  useAdminPendingProducts,
  useAdminFlags,
  useReviewProduct,
} from "@/lib/queries/hooks";
import { ApproveIcon, RejectIcon } from "@/components/admin/AdminActionIcons";
import { playApproveSound, playRejectSound } from "@/lib/sounds";
import type { AdminPendingProduct, AdminFlaggedReport } from "@/lib/queries/fetchers";

type Stats = {
  reports_today?: number;
  pending_products?: number;
  flagged_count?: number;
  active_contributors?: number;
  submission_volume?: number[];
  top_categories?: { id: string; name_ar: string; icon: string | null; count: number }[];
  total_users?: number;
  top_contributors?: { id: string; display_handle: string | null; area: { name_ar: string } | null; report_count: number }[];
  regional_coverage?: { id: string; name_ar: string; count: number }[];
};

export default function AdminDashboardPage() {
  const { toast } = useAdminToast();
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const statsQuery = useAdminStats();
  const pendingQuery = useAdminPendingProducts(6, 0);
  const flagsQuery = useAdminFlags(5, 0);
  const reviewMutation = useReviewProduct();

  const stats = (statsQuery.data ?? {}) as Stats;
  const pendingProducts = (pendingQuery.data?.products ?? []) as AdminPendingProduct[];
  const flaggedReports = (flagsQuery.data?.reports ?? []) as AdminFlaggedReport[];
  const loading = statsQuery.isLoading || pendingQuery.isLoading || flagsQuery.isLoading;

  const { setRight } = useAdminHeader();

  useEffect(() => {
    setRight(
      <div className="flex items-center gap-1.5 rounded-full border border-[#4A7C5940] bg-gradient-to-r from-[#4A7C5925] to-[#4A9FD420] px-3 py-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-[#6BA880] animate-pulse shadow-[0_0_6px_#6BA880]" />
        <span className="text-[11px] font-medium text-[#6BA880]">Live · Data syncing</span>
      </div>
    );
    return () => setRight(null);
  }, [setRight]);

  async function handleReview(id: string, action: "approve" | "reject") {
    setReviewingId(id);
    try {
      await reviewMutation.mutateAsync({ id, action });
      if (action === "approve") playApproveSound();
      else playRejectSound();
      toast(action === "approve" ? "Product approved" : "Product rejected", "success");
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
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#243040] border-t-[#4A7C59] border-r-[#4A9FD4]" />
            <span className="text-sm text-[#8FA3B8]">Loading dashboard…</span>
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
            { label: "Total Users", value: String(stats.total_users ?? "—"), icon: "🧑‍🤝‍🧑", color: "purple", delta: "Registered users" },
          ].map((s) => (
            <div
              key={s.label}
              className={`admin-stat-card relative overflow-hidden rounded-[10px] border max-sm:py-[14px] max-sm:px-4 sm:p-5 transition-all duration-200 ${s.color === "olive" ? "olive" : ""} ${s.color === "sand" ? "sand" : ""} ${s.color === "red" ? "red" : ""} ${s.color === "sky" ? "sky" : ""} ${s.color === "purple" ? "purple" : ""}`}
            >
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#4E6070]">{s.label}</span>
                <span className="text-lg opacity-90">{s.icon}</span>
              </div>
              <div className={`text-[22px] sm:text-[26px] font-bold tracking-tight mb-2 font-mono ${s.color === "olive" ? "text-[#6BA880]" : s.color === "sand" ? "text-[#E8C98A]" : s.color === "red" ? "text-[#E8887A]" : s.color === "purple" ? "text-[#B89AE8]" : "text-[#7AC4F0]"}`}>{s.value}</div>
              <div className="text-[11px] text-[#4E6070]">{s.delta}</div>
            </div>
          ))}
        </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_360px]">
          {/* Suggestions table */}
          <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820] border-l-4 border-l-[#C9A96E]">
            <div className="flex items-center justify-between border-b border-[#243040] px-5 py-4 bg-[#18212C]/50">
              <div>
                <div className="text-[13px] font-semibold text-[#D8E4F0]">Recent Suggestions</div>
                <div className="text-[11px] text-[#8FA3B8] mt-0.5">Product suggestions · <span className="text-[#E8C98A] font-medium">{stats.pending_products ?? pendingProducts.length}</span> pending</div>
              </div>
              <div className="flex gap-2 items-center">
                <Link
                  href="/admin/suggestions?add=1"
                  className="rounded-lg bg-[#4A7C59] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A6347] transition-colors inline-block"
                >
                  + Add Suggest
                </Link>
                <Link
                  href="/admin/suggestions"
                  className="rounded-lg border border-[#C9A96E] bg-[#C9A96E20] px-3 py-1.5 text-xs font-medium text-[#E8C98A] hover:bg-[#C9A96E30] transition-colors inline-block"
                >
                  View All
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
              {pendingProducts.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#4E6070]">No pending suggestions</div>
              ) : (
                <table className="w-full min-w-[480px] text-left">
                  <thead>
                    <tr className="border-b border-[#243040]">
                      <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-12">#</th>
                      <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Product</th>
                      <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Suggested</th>
                      <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Status</th>
                      <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingProducts.map((p, i) => (
                      <tr
                        key={p.id}
                        className="border-b border-[#243040] transition-colors hover:bg-[#18212C] cursor-pointer"
                      >
                        <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">{i + 1}</td>
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
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => handleReview(p.id, "approve")}
                              disabled={reviewingId === p.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#4A7C59] bg-[#4A7C59] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A6347] hover:border-[#3A6347] disabled:opacity-50 transition-colors"
                            >
                              <ApproveIcon />
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(p.id, "reject")}
                              disabled={reviewingId === p.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#A85852] bg-[#A8585218] px-3 py-1.5 text-xs font-medium text-[#D49088] hover:bg-[#A8585228] hover:border-[#A85852] disabled:opacity-50 transition-colors"
                            >
                              <RejectIcon />
                              Reject
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
            <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820] border-l-4 border-l-[#A85852]">
              <div className="flex items-center justify-between border-b border-[#243040] px-5 py-4 bg-[#1a1414]/40">
                <div>
                  <div className="text-[13px] font-semibold text-[#D8E4F0]">Flagged Reports</div>
                  <div className="text-[11px] text-[#8FA3B8] mt-0.5">Requires attention</div>
                </div>
                <Link
                  href="/admin/flags"
                  className="rounded-lg border border-[#A85852] bg-[#A8585225] px-3 py-1.5 text-xs font-medium text-[#E8887A] hover:bg-[#A8585235] transition-colors inline-block"
                >
                  All flags
                </Link>
              </div>
              <div className="divide-y divide-[#243040]">
                {(stats.flagged_count ?? 0) > 0 && (
                  <Link href="/admin/flags" className="flex items-start gap-3 px-5 py-3 hover:bg-[#18212C] cursor-pointer transition-colors block">
                    <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#E05A4E] ring-2 ring-[#E05A4E40]" />
                    <div>
                      <div className="text-xs font-medium text-[#D8E4F0]">{stats.flagged_count} flagged reports need review</div>
                      <div className="mt-0.5 text-[10px] font-mono text-[#8FA3B8]">Flagged by users</div>
                    </div>
                  </Link>
                )}
                {(stats.pending_products ?? 0) > 0 && (
                  <Link href="/admin/suggestions" className="flex items-start gap-3 px-5 py-3 hover:bg-[#18212C] cursor-pointer transition-colors block">
                    <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#4A7C59] ring-2 ring-[#4A7C5940]" />
                    <div>
                      <div className="text-xs font-medium text-[#D8E4F0]">{stats.pending_products} product suggestions queued</div>
                      <div className="mt-0.5 text-[10px] font-mono text-[#8FA3B8]">Ongoing</div>
                    </div>
                  </Link>
                )}
                {(stats.flagged_count ?? 0) === 0 && (stats.pending_products ?? 0) === 0 && (
                  <div className="px-5 py-8 text-center text-xs text-[#4E6070]">No flagged reports</div>
                )}
              </div>
            </div>

            {/* Submission Volume - Last 7 days */}
            <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820] border-l-4 border-l-[#4A7C59]">
              <div className="border-b border-[#243040] px-5 py-4 bg-[#0f1a14]/30">
                <div className="text-[13px] font-semibold text-[#D8E4F0]">Submission Volume</div>
                <div className="text-[11px] text-[#8FA3B8] mt-0.5">Last 7 days · Price reports submitted</div>
              </div>
              <div className="p-5">
                <div className="flex items-end gap-1.5 mb-2.5 h-[140px]">
                  {(stats.submission_volume ?? [0, 0, 0, 0, 0, 0, 0]).map((count, i) => {
                    const max = Math.max(1, ...(stats.submission_volume ?? [1]));
                    const pct = Math.round((count / max) * 100);
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
                    const barColors = [
                      "from-[#4A7C59] to-[#6BA880]",
                      "from-[#4A9FD4] to-[#7AC4F0]",
                      "from-[#C9A96E] to-[#E8C98A]",
                      "from-[#4A7C59] to-[#8BC99A]",
                      "from-[#A85852] to-[#E8887A]",
                      "from-[#4A9FD4] to-[#9DD4F5]",
                      "from-[#C9A96E] to-[#F0D9A8]",
                    ];
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t min-h-[4px] bg-gradient-to-t ${barColors[i]} transition-all hover:opacity-90`}
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
                <div className="mt-2 flex items-center gap-2 text-[10.5px] text-[#8FA3B8]">
                  <div className="h-2 w-4 rounded-sm bg-gradient-to-r from-[#4A7C59] to-[#6BA880]" />
                  <span>Submitted</span>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Bottom row - Top Categories, Contributors, Regional Coverage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820] border-l-4 border-l-[#4A9FD4]">
            <div className="flex items-center justify-between border-b border-[#243040] px-5 py-4 bg-[#0f141a]/40">
              <div className="text-[13px] font-semibold text-[#D8E4F0]">Top Categories</div>
              <Link href="/admin/categories" className="text-[11px] font-medium text-[#7AC4F0] hover:text-[#9DD4F5] hover:underline cursor-pointer transition-colors">
                Manage
              </Link>
            </div>
            <div className="divide-y divide-[#243040]">
              {(stats.top_categories ?? []).length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-[#4E6070]">No categories with reports yet</div>
              ) : (
                (stats.top_categories ?? []).map((c, idx) => {
                  const max = Math.max(1, ...(stats.top_categories ?? []).map((x) => x.count));
                  const pct = max > 0 ? Math.round((c.count / max) * 100) : 0;
                  const gradients = [
                    "from-[#4A7C59] to-[#6BA880]",
                    "from-[#4A9FD4] to-[#7AC4F0]",
                    "from-[#C9A96E] to-[#E8C98A]",
                    "from-[#4A7C59] to-[#8BC99A]",
                    "from-[#A85852] to-[#E8887A]",
                  ];
                  const grad = gradients[idx % gradients.length];
                  return (
                    <div key={c.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-[#18212C]/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{c.icon || "📦"}</span>
                        <div>
                          <div className="text-xs font-medium text-[#D8E4F0]">{c.name_ar}</div>
                          <div className="text-[10px] text-[#8FA3B8]">{c.count} reports</div>
                        </div>
                      </div>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#1E2B38]">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${grad} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820] border-l-4 border-l-[#C9A96E]">
            <div className="flex items-center justify-between border-b border-[#243040] px-5 py-4 bg-[#1a1814]/30">
              <div className="text-[13px] font-semibold text-[#D8E4F0]">Top Contributors</div>
              <Link href="/admin/users" className="text-[11px] font-medium text-[#E8C98A] hover:text-[#F0D9A8] hover:underline cursor-pointer transition-colors">
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
          <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820] border-l-4 border-l-[#4A7C59]">
            <div className="flex items-center justify-between border-b border-[#243040] px-5 py-4 bg-[#0f1a14]/30">
              <div className="text-[13px] font-semibold text-[#D8E4F0]">Regional Coverage</div>
              <Link href="/admin/areas" className="text-[11px] font-medium text-[#6BA880] hover:text-[#8BC99A] hover:underline cursor-pointer transition-colors">
                View Areas
              </Link>
            </div>
            <div className="divide-y divide-[#243040]">
              {(stats.regional_coverage ?? []).length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-[#4E6070]">No regional data yet</div>
              ) : (
                (stats.regional_coverage ?? []).map((r, idx) => {
                  const max = Math.max(1, ...(stats.regional_coverage ?? []).map((x) => x.count));
                  const pct = max > 0 ? Math.round((r.count / max) * 100) : 0;
                  const gradients = [
                    "from-[#4A7C59] to-[#6BA880]",
                    "from-[#C9A96E] to-[#E8C98A]",
                    "from-[#4A9FD4] to-[#7AC4F0]",
                    "from-[#4A7C59] to-[#8BC99A]",
                    "from-[#A85852] to-[#E8887A]",
                  ];
                  const grad = gradients[idx % gradients.length];
                  return (
                    <div key={r.id} className="px-5 py-2.5 hover:bg-[#18212C]/50 transition-colors">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-medium text-[#D8E4F0]">{r.name_ar}</span>
                        <span className="text-[11px] text-[#8FA3B8] font-mono">{r.count} reports</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#1E2B38]">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${grad} transition-all`}
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
