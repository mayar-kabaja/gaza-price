"use client";

import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";

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

const PAGE_SIZE = 50;

export default function AdminSuggestionsPage() {
  const { toast } = useAdminToast();
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  function load() {
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    fetch(`/api/admin/products/pending?limit=${PAGE_SIZE}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setProducts(d?.products ?? []);
        setTotal(d?.total ?? 0);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [offset]);

  async function handleReview(id: string, action: "approve" | "reject") {
    const token = getStoredToken();
    if (!token) return;
    setReviewingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast(action === "approve" ? "Product approved" : "Product rejected", "success");
        load();
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
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
          <div className="border-b border-[#243040] px-5 py-4">
            <div className="text-[13px] font-semibold text-[#D8E4F0]">Pending Product Suggestions</div>
            <div className="text-[11px] text-[#4E6070] mt-0.5">{total} awaiting verification</div>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4E6070]">No pending suggestions</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#243040]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Product</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Suggested</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">By</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                      <td className="px-5 py-3">
                        <div>
                          <div className="text-xs font-medium text-[#D8E4F0]">{p.name_ar}</div>
                          <div className="text-[10px] text-[#4E6070]">{p.category?.name_ar ?? "—"}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">
                        {p.pending_price != null ? `₪ ${p.pending_price}` : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-[#8FA3B8]">{p.suggested_by_handle ?? "—"}</td>
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
                            ✕ Reject
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
        {total > PAGE_SIZE && (
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              disabled={offset === 0}
              className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] disabled:opacity-50 hover:bg-[#243040]"
            >
              Previous
            </button>
            <span className="text-sm text-[#4E6070]">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </span>
            <button
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
              className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] disabled:opacity-50 hover:bg-[#243040]"
            >
              Next
            </button>
          </div>
        )}
    </div>
  );
}
