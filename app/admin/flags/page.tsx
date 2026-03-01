"use client";

import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";

type FlaggedReport = {
  id: string;
  price: number;
  product?: { name_ar: string };
  flag_count: number;
  flags?: { reason?: string; flagged_at?: string }[];
  reported_at?: string;
};

export default function AdminFlagsPage() {
  const { toast } = useAdminToast();
  const [reports, setReports] = useState<FlaggedReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  function load() {
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    fetch("/api/admin/flags?status=flagged&limit=50&offset=0", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setReports(d?.reports ?? []);
        setTotal(d?.total ?? 0);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStatus(id: string, status: "confirmed" | "rejected") {
    const token = getStoredToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/prices/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast(status === "confirmed" ? "Report approved" : "Report rejected", "success");
        setReports((prev) => prev.filter((r) => r.id !== id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        toast("Action failed", "error");
      }
    } catch {
      toast("Action failed", "error");
    }
  }

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
          <div className="border-b border-[#243040] px-5 py-4">
            <div className="text-[13px] font-semibold text-[#D8E4F0]">Flagged Price Reports</div>
            <div className="text-[11px] text-[#4E6070] mt-0.5">{total} reports flagged by users</div>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4E6070]">No flagged reports</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#243040]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Product</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Price</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Flags</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Reported</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                      <td className="px-5 py-3 text-xs font-medium text-[#D8E4F0]">
                        {r.product?.name_ar ?? "—"}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">₪ {r.price}</td>
                      <td className="px-5 py-3">
                        <div className="space-y-1">
                          {(r.flags ?? []).slice(0, 2).map((f, i) => (
                            <div key={i} className="text-[11px] text-[#8FA3B8]">
                              {f.reason ?? "No reason"}
                            </div>
                          ))}
                          {(r.flags?.length ?? 0) > 2 && (
                            <div className="text-[10px] text-[#4E6070]">+{(r.flags?.length ?? 0) - 2} more</div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">
                        {r.reported_at ? new Date(r.reported_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleStatus(r.id, "confirmed")}
                            className="rounded border border-[#4A7C59] bg-[#4A7C5920] px-2 py-1 text-[11px] text-[#6BA880] hover:bg-[#4A7C5930]"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatus(r.id, "rejected")}
                            className="rounded border border-[#E05A4E30] bg-[#E05A4E18] px-2 py-1 text-[11px] text-[#E05A4E] hover:bg-[#E05A4E30]"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  );
}
