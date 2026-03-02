"use client";

import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth/token";
import { apiFetch } from "@/lib/api/fetch";
import { useAdminToast } from "@/components/admin/AdminToast";
import { ViewIcon, EditIcon, ApproveIcon, RemoveIcon } from "@/components/admin/AdminActionIcons";

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
  const [addOptionsLoading, setAddOptionsLoading] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<FlaggedReport | null>(null);
  const [editForm, setEditForm] = useState(ADD_FORM_EMPTY);
  const [editSaving, setEditSaving] = useState(false);
  const [editFetching, setEditFetching] = useState(false);

  // View: fetch price to get product_id, then navigate
  const [viewLoadingId, setViewLoadingId] = useState<string | null>(null);

  function load() {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch("/api/admin/flags?status=flagged&limit=50&offset=0")
      .then((r) => r.json())
      .then((d) => {
        setReports(d?.reports ?? []);
        setTotal(d?.total ?? 0);
      })
      .catch(() => {
        setReports([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!showAddModal && !editTarget) return;
    setAddOptionsLoading(true);
    Promise.all([
      fetch("/api/products?limit=50").then((r) => r.json()).then((d) => d?.products ?? []).catch(() => []),
      fetch("/api/areas").then((r) => r.json()).then((d) => d?.areas ?? []).catch(() => []),
    ]).then(([prods, ars]) => {
      setProducts(prods);
      setAreas(ars);
    }).finally(() => setAddOptionsLoading(false));
  }, [showAddModal, editTarget]);

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

  async function openEditModal(r: FlaggedReport) {
    setEditTarget(r);
    setEditFetching(true);
    try {
      const res = await fetch(`/api/prices/${r.id}`);
      const data = await res.json();
      if (res.ok && data) {
        setEditForm({
          product_id: data?.product_id ?? data?.product?.id ?? "",
          area_id: data?.area_id ?? data?.area?.id ?? "",
          price: data?.price != null ? String(data.price) : "",
        });
      } else {
        toast("Could not load report details", "error");
        setEditTarget(null);
      }
    } catch {
      toast("Could not load report details", "error");
      setEditTarget(null);
    } finally {
      setEditFetching(false);
    }
  }

  async function handleEditSubmit() {
    if (!editTarget) return;
    const token = getStoredToken();
    if (!token) {
      toast("Login required", "error");
      return;
    }
    if (!editForm.product_id?.trim() || !editForm.area_id?.trim()) {
      toast("Select product and area", "error");
      return;
    }
    const priceNum = parseFloat(editForm.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast("Enter a valid price", "error");
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/prices/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          product_id: editForm.product_id,
          area_id: editForm.area_id,
          price: priceNum,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast("Report updated", "success");
        setEditTarget(null);
        load();
      } else {
        toast(data?.message ?? "Failed to update report", "error");
      }
    } catch {
      toast("Failed to update report", "error");
    } finally {
      setEditSaving(false);
    }
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
        <div className="mb-4 flex flex-nowrap gap-2 sm:gap-3 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product or price..."
            className="flex-1 min-w-0 rounded-lg border border-[#243040] bg-[#18212C] px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
          />
          <button
            onClick={openAddModal}
            className="flex-shrink-0 rounded-lg bg-[#4A7C59] px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#3A6347]"
          >
            + Add Report
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
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-12">#</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Product</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Price</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Status</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Flags</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Reported</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((r, i) => (
                    <tr key={r.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                      <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">{i + 1}</td>
                      <td className="px-5 py-3 text-xs font-medium text-[#D8E4F0]">
                        {r.product?.name_ar ?? "—"}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">₪ {r.price}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-full border border-[#D4913A35] bg-[#D4913A18] px-2.5 py-0.5 text-[10px] font-medium text-[#E8B870]">Flagged</span>
                      </td>
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
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#3B82F6] bg-[#3B82F618] px-3 py-1.5 text-xs font-medium text-[#60A5FA] hover:bg-[#3B82F628] disabled:opacity-50 transition-colors"
                          >
                            <ViewIcon />
                            {viewLoadingId === r.id ? "..." : "View"}
                          </button>
                          <button
                            onClick={() => openEditModal(r)}
                            disabled={editFetching}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#64748B] bg-[#334155] px-3 py-1.5 text-xs font-medium text-[#94A3B8] hover:bg-[#475569] hover:border-[#64748B] disabled:opacity-50 transition-colors"
                          >
                            <EditIcon />
                            Edit
                          </button>
                          <button
                            onClick={() => setApproveTarget(r)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#4A7C59] bg-[#4A7C59] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A6347] hover:border-[#3A6347] disabled:opacity-50 transition-colors"
                          >
                            <ApproveIcon />
                            Approve
                          </button>
                          <button
                            onClick={() => setRemoveTarget(r)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#A85852] bg-[#A8585218] px-3 py-1.5 text-xs font-medium text-[#D49088] hover:bg-[#A8585228] hover:border-[#A85852] disabled:opacity-50 transition-colors"
                          >
                            <RemoveIcon />
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
              <button type="button" onClick={confirmRemove} disabled={actionLoading} className="flex-1 rounded-lg border border-[#A85852] bg-[#A8585218] px-4 py-2 text-sm font-medium text-[#D49088] hover:bg-[#A8585228] disabled:opacity-50 transition-colors">{actionLoading ? "..." : "Yes, Remove"}</button>
            </div>
          </div>
        </>
      )}

      {/* Edit modal */}
      {editTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !editSaving && !editFetching && setEditTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-4">Edit Price Report</h3>
            {editFetching ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Product</label>
                    <select
                      value={editForm.product_id}
                      onChange={(e) => setEditForm((f) => ({ ...f, product_id: e.target.value }))}
                      disabled={addOptionsLoading}
                      className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59] disabled:opacity-70"
                    >
                      <option value="">{addOptionsLoading ? "Loading..." : "Select product..."}</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name_ar}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Area</label>
                    <select
                      value={editForm.area_id}
                      onChange={(e) => setEditForm((f) => ({ ...f, area_id: e.target.value }))}
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
                      value={editForm.price}
                      onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={() => setEditTarget(null)} disabled={editSaving} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
                  <button type="button" onClick={handleEditSubmit} disabled={editSaving} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347] disabled:opacity-50">{editSaving ? "..." : "Save"}</button>
                </div>
              </>
            )}
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
                  disabled={addOptionsLoading}
                  className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59] disabled:opacity-70"
                >
                  <option value="">{addOptionsLoading ? "Loading products..." : "Select product..."}</option>
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
