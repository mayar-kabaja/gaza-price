"use client";

import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";

type FlaggedReport = {
  id: string;
  price: number;
  product?: { name_ar?: string };
  flag_count: number;
  flags?: { reason?: string; flagged_at?: string }[];
  reported_at?: string;
};

type Product = { id: string; name_ar: string };
type Area = { id: string; name_ar: string };

const ADD_FORM_EMPTY = { product_id: "", area_id: "", price: "" };

export default function AdminFlagsPage() {
  const { toast } = useAdminToast();
  const [reports, setReports] = useState<FlaggedReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Confirmation modals
  const [approveTarget, setApproveTarget] = useState<FlaggedReport | null>(null);
  const [removeTarget, setRemoveTarget] = useState<FlaggedReport | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // +Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(ADD_FORM_EMPTY);
  const [addSaving, setAddSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  // View: fetch price to get product_id, then navigate
  const [viewLoadingId, setViewLoadingId] = useState<string | null>(null);

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

  useEffect(() => {
    fetch("/api/products?all=1&limit=500")
      .then((r) => r.json())
      .then((d) => setProducts(d?.products ?? []))
      .catch(() => setProducts([]));
    fetch("/api/areas")
      .then((r) => r.json())
      .then((d) => setAreas(d?.areas ?? []))
      .catch(() => setAreas([]));
  }, []);

  const filteredReports = search.trim()
    ? reports.filter((r) => {
        const q = search.trim().toLowerCase();
        const name = (r.product?.name_ar ?? "").toLowerCase();
        const price = String(r.price ?? "");
        return name.includes(q) || price.includes(q);
      })
    : reports;

  async function confirmApprove() {
    if (!approveTarget) return;
    const token = getStoredToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/prices/${approveTarget.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "confirmed" }),
      });
      if (res.ok) {
        toast("Report approved", "success");
        setApproveTarget(null);
        setReports((prev) => prev.filter((r) => r.id !== approveTarget.id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        toast("Action failed", "error");
      }
    } catch {
      toast("Action failed", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    const token = getStoredToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/prices/${removeTarget.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (res.ok) {
        toast("Report removed", "success");
        setRemoveTarget(null);
        setReports((prev) => prev.filter((r) => r.id !== removeTarget.id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        toast("Action failed", "error");
      }
    } catch {
      toast("Action failed", "error");
    } finally {
      setActionLoading(false);
    }
  }

  function openAddModal() {
    setAddForm(ADD_FORM_EMPTY);
    setShowAddModal(true);
  }

  async function handleAddSubmit() {
    const token = getStoredToken();
    if (!token) {
      toast("Login required", "error");
      return;
    }
    if (!addForm.product_id?.trim() || !addForm.area_id?.trim()) {
      toast("Select product and area", "error");
      return;
    }
    const priceNum = parseFloat(addForm.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast("Enter a valid price", "error");
      return;
    }
    setAddSaving(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          product_id: addForm.product_id,
          area_id: addForm.area_id,
          price: priceNum,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast("Report added", "success");
        setShowAddModal(false);
        setAddForm(ADD_FORM_EMPTY);
        load();
      } else {
        toast(data?.message ?? "Failed to add report", "error");
      }
    } catch {
      toast("Failed to add report", "error");
    } finally {
      setAddSaving(false);
    }
  }

  async function handleView(r: FlaggedReport) {
    setViewLoadingId(r.id);
    try {
      const res = await fetch(`/api/prices/${r.id}`);
      const data = await res.json();
      const productId = data?.product?.id;
      if (productId) {
        window.open(`/product/${productId}`, "_blank");
      } else {
        toast("Could not load product", "error");
      }
    } catch {
      toast("Could not load product", "error");
    } finally {
      setViewLoadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product or price..."
            className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] min-w-[200px]"
          />
          <button
            onClick={openAddModal}
            className="rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]"
          >
            + Add
          </button>
        </div>
        <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
          <div className="border-b border-[#243040] px-5 py-4">
            <div className="text-[13px] font-semibold text-[#D8E4F0]">Flagged Price Reports</div>
            <div className="text-[11px] text-[#4E6070] mt-0.5">{total} reports flagged by users</div>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4E6070]">
              {search.trim() ? "No reports match your search." : "No flagged reports"}
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
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
                  {filteredReports.map((r) => (
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
                        <div className="flex gap-2 flex-wrap items-center">
                          <button
                            onClick={() => handleView(r)}
                            disabled={viewLoadingId === r.id}
                            className="text-[11px] text-[#6BA880] hover:underline disabled:opacity-50"
                          >
                            {viewLoadingId === r.id ? "..." : "View"}
                          </button>
                          <button
                            onClick={() => setApproveTarget(r)}
                            className="rounded border border-[#4A7C59] bg-[#4A7C5920] px-2 py-1 text-[11px] text-[#6BA880] hover:bg-[#4A7C5930]"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRemoveTarget(r)}
                            className="rounded border border-[#E05A4E30] bg-[#E05A4E18] px-2 py-1 text-[11px] text-[#E05A4E] hover:bg-[#E05A4E30]"
                          >
                            Remove
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

      {/* Approve confirmation */}
      {approveTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !actionLoading && setApproveTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-2">Approve Report</h3>
            <p className="text-sm text-[#8FA3B8] mb-4">
              Are you sure you want to approve this flagged price report for &ldquo;{approveTarget.product?.name_ar ?? "—"}&rdquo; (₪{approveTarget.price})? The price will remain active.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setApproveTarget(null)} disabled={actionLoading} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmApprove} disabled={actionLoading} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347] disabled:opacity-50">{actionLoading ? "..." : "Yes, Approve"}</button>
            </div>
          </div>
        </>
      )}

      {/* Remove confirmation */}
      {removeTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !actionLoading && setRemoveTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-2">Remove Report</h3>
            <p className="text-sm text-[#8FA3B8] mb-4">
              Are you sure you want to remove this flagged price report for &ldquo;{removeTarget.product?.name_ar ?? "—"}&rdquo; (₪{removeTarget.price})? The price will be rejected.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRemoveTarget(null)} disabled={actionLoading} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmRemove} disabled={actionLoading} className="flex-1 rounded-lg bg-[#E05A4E] px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">{actionLoading ? "..." : "Yes, Remove"}</button>
            </div>
          </div>
        </>
      )}

      {/* +Add modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !addSaving && setShowAddModal(false)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-4">Add Price Report</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#4E6070] mb-1">Product</label>
                <select
                  value={addForm.product_id}
                  onChange={(e) => setAddForm((f) => ({ ...f, product_id: e.target.value }))}
                  className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name_ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#4E6070] mb-1">Area</label>
                <select
                  value={addForm.area_id}
                  onChange={(e) => setAddForm((f) => ({ ...f, area_id: e.target.value }))}
                  className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                >
                  <option value="">Select area...</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name_ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#4E6070] mb-1">Price (₪)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={addForm.price}
                  onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setShowAddModal(false)} disabled={addSaving} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleAddSubmit} disabled={addSaving} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347] disabled:opacity-50">{addSaving ? "..." : "Add"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
