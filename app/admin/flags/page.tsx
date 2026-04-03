"use client";

import { useEffect, useRef, useState } from "react";
import { getAdminToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";

type FlaggedReport = {
  id: string;
  price: number;
  product?: { name_ar?: string };
  flag_count: number;
  flags?: { reason?: string; flagged_at?: string }[];
  reported_at?: string;
  status?: string;
};

type Product = { id: string; name_ar: string };
type Area = { id: string; name_ar: string };

const ADD_FORM_EMPTY = { product_id: "", area_id: "", price: "" };

function statusBadge(status?: string) {
  const cls = status === "confirmed"
    ? "border-[#4A7C5935] bg-[#4A7C5920] text-[#6BA880]"
    : status === "rejected"
      ? "border-[#A8585235] bg-[#A8585218] text-[#D49088]"
      : "border-[#D4913A35] bg-[#D4913A18] text-[#E8B870]";
  const dot = status === "confirmed" ? "🟢" : status === "rejected" ? "🔴" : "🟡";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      <span className="text-[8px]">{dot}</span> {status ?? "—"}
    </span>
  );
}

export default function AdminFlagsPage() {
  const { toast } = useAdminToast();
  const [reports, setReports] = useState<FlaggedReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Column filters
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending" | "rejected">("all");
  const [filterProduct, setFilterProduct] = useState("");
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  // Clickable status dropdown
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [loadingStatusId, setLoadingStatusId] = useState<string | null>(null);

  // Kebab action menu
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

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
    const token = getAdminToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const searchTerm = filterProduct.trim();
    const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : "";
    fetch(`/api/admin/flags?status=all&limit=${limit}&offset=${offset}${searchParam}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    })
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
  }, [offset]);

  // Debounced server-side search when product filter changes
  const filterProductRef = useRef(filterProduct);
  filterProductRef.current = filterProduct;
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filterProductRef.current === filterProduct) {
        setOffset(0);
        load();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filterProduct]);

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

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  async function handleStatusChange(id: string, newStatus: string) {
    const token = getAdminToken();
    if (!token) return;
    setLoadingStatusId(id);
    setStatusDropdownId(null);
    try {
      const res = await fetch(`/api/admin/prices/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r));
        toast(`Status changed to ${newStatus}`, "success");
      } else {
        toast("Action failed", "error");
      }
    } catch {
      toast("Action failed", "error");
    } finally {
      setLoadingStatusId(null);
    }
  }

  function openAddModal() {
    setAddForm(ADD_FORM_EMPTY);
    setShowAddModal(true);
  }

  async function openEditModal(r: FlaggedReport) {
    setActionMenuId(null);
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
    const token = getAdminToken();
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
    const token = getAdminToken();
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
    setActionMenuId(null);
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

  function handleRemove(r: FlaggedReport) {
    setActionMenuId(null);
    handleStatusChange(r.id, "rejected");
  }

  function handleApprove(r: FlaggedReport) {
    setActionMenuId(null);
    handleStatusChange(r.id, "confirmed");
  }

  function handleUnapprove(r: FlaggedReport) {
    setActionMenuId(null);
    handleStatusChange(r.id, "pending");
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClick() {
      setStatusDropdownId(null);
      setActionMenuId(null);
      setOpenFilter(null);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const funnelIcon = (active: boolean) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={active ? "#4A7C59" : "currentColor"} strokeWidth="2">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
    </svg>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820] flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-[#243040]">
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-12">#</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                    <div className="flex items-center gap-1.5">
                      Product
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenFilter(openFilter === "product" ? null : "product")}
                          className="p-0.5 rounded hover:bg-[#243040] transition-colors"
                        >
                          {funnelIcon(!!filterProduct.trim())}
                        </button>
                        {openFilter === "product" && (
                          <div className="absolute top-full left-0 mt-1 z-30 w-48 rounded-lg border border-[#243040] bg-[#18212C] p-2 shadow-xl">
                            <input
                              type="text"
                              value={filterProduct}
                              onChange={(e) => setFilterProduct(e.target.value)}
                              placeholder="Filter product..."
                              autoFocus
                              className="w-full rounded-md border border-[#243040] bg-[#111820] px-2 py-1.5 text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Price</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                    <div className="flex items-center gap-1.5">
                      Status
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenFilter(openFilter === "status" ? null : "status")}
                          className="p-0.5 rounded hover:bg-[#243040] transition-colors"
                        >
                          {funnelIcon(statusFilter !== "all")}
                        </button>
                        {openFilter === "status" && (
                          <div className="absolute top-full left-0 mt-1 z-30 w-40 rounded-lg border border-[#243040] bg-[#18212C] p-1 shadow-xl">
                            {(["all", "confirmed", "pending", "rejected"] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => { setStatusFilter(s); setOpenFilter(null); }}
                                className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${
                                  statusFilter === s
                                    ? "bg-[#4A7C5930] text-[#6BA880]"
                                    : "text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0]"
                                }`}
                              >
                                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Flags</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Reported</th>
                  <th className="px-5 py-2.5 text-center">
                    <button onClick={openAddModal} className="w-7 h-7 rounded-full bg-[#4A7C59] text-white hover:bg-[#3A6347] transition-colors inline-flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-[#4E6070]">
                      No flagged reports
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((r, i) => (
                    <tr key={r.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                      <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">{i + 1}</td>
                      <td className="px-5 py-3 text-xs font-medium text-[#D8E4F0]">
                        {r.product?.name_ar ?? "—"}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">₪ {r.price}</td>
                      <td className="px-5 py-3">
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setStatusDropdownId(statusDropdownId === r.id ? null : r.id)}
                            disabled={loadingStatusId === r.id}
                            className="cursor-pointer disabled:opacity-50"
                          >
                            {loadingStatusId === r.id ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#4E6070]">...</span>
                            ) : (
                              statusBadge(r.status)
                            )}
                          </button>
                          {statusDropdownId === r.id && (
                            <div className="absolute top-full left-0 mt-1 z-30 w-36 rounded-lg border border-[#243040] bg-[#18212C] p-1 shadow-xl">
                              {(["confirmed", "pending", "rejected"] as const).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => handleStatusChange(r.id, s)}
                                  className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${
                                    r.status === s
                                      ? "bg-[#4A7C5930] text-[#6BA880]"
                                      : "text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0]"
                                  }`}
                                >
                                  {s === "confirmed" ? "🟢 Confirmed" : s === "rejected" ? "🔴 Rejected" : "🟡 Pending"}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-1">
                          {(r.flags ?? []).slice(0, 2).map((f, fi) => (
                            <div key={fi} className="text-[11px] text-[#8FA3B8]">
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
                      <td className="px-5 py-3 text-center">
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setActionMenuId(actionMenuId === r.id ? null : r.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] transition-colors cursor-pointer"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                          </button>
                          {actionMenuId === r.id && (
                            <div className="absolute right-0 top-full mt-1 z-30 w-40 rounded-lg border border-[#243040] bg-[#18212C] p-1 shadow-xl">
                              <button
                                onClick={() => handleView(r)}
                                disabled={viewLoadingId === r.id}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] rounded-md transition-colors disabled:opacity-50"
                              >
                                {viewLoadingId === r.id ? "Loading..." : "View"}
                              </button>
                              <button
                                onClick={() => openEditModal(r)}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] rounded-md transition-colors"
                              >
                                Edit
                              </button>
                              {r.status === "pending" && (
                                <button
                                  onClick={() => handleApprove(r)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] rounded-md transition-colors"
                                >
                                  Approve
                                </button>
                              )}
                              {r.status === "confirmed" && (
                                <button
                                  onClick={() => handleUnapprove(r)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] rounded-md transition-colors"
                                >
                                  Unapprove
                                </button>
                              )}
                              {r.status !== "rejected" && (
                                <>
                                  <div className="my-1 border-t border-[#243040]" />
                                  <button
                                    onClick={() => handleRemove(r)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-[#D49088] hover:bg-[#A8585218] rounded-md transition-colors"
                                  >
                                    Remove
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
                      dir="ltr"
                      lang="en"
                      className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
                    />
                    <p className="mt-1 text-[10px] text-[#4E6070]">Use English digits (0-9) only</p>
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
                  dir="ltr"
                  lang="en"
                  className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
                />
                <p className="mt-1 text-[10px] text-[#4E6070]">Use English digits (0-9) only</p>
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
