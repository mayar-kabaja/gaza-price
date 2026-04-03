"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getAdminToken } from "@/lib/auth/token";
import { apiFetchAdmin } from "@/lib/api/fetch";
import { useAdminToast } from "@/components/admin/AdminToast";
import { PRODUCT_UNITS } from "@/lib/constants";

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

type Category = { id: string; name_ar: string };

const PAGE_SIZE = 20;
const ADD_FORM_EMPTY = { name_ar: "", name_en: "", category_id: "", unit: "كغ", unit_size: 1 };

export default function AdminSuggestionsPage() {
  const { toast } = useAdminToast();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(ADD_FORM_EMPTY);
  const [addSaving, setAddSaving] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filters
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [filterProduct, setFilterProduct] = useState("");
  const [filterBy, setFilterBy] = useState("");

  // Kebab menu
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  function load(showSpinner = true) {
    const token = getAdminToken();
    if (!token) {
      setLoading(false);
      return;
    }
    if (showSpinner) setLoading(true);
    let url = `/api/admin/products/pending?limit=${PAGE_SIZE}&offset=${offset}`;
    if (filterProduct.trim()) url += '&search=' + encodeURIComponent(filterProduct.trim());
    apiFetchAdmin(url)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d?.products ?? []);
        setTotal(d?.total ?? 0);
      })
      .catch(() => {
        setProducts([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [offset]);

  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(0);
      load(true);
    }, 300);
    return () => clearTimeout(t);
  }, [filterProduct]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setAddForm(ADD_FORM_EMPTY);
      setShowAddConfirm(false);
      setShowAddModal(true);
      window.history.replaceState({}, "", "/admin/suggestions");
    }
  }, [searchParams]);

  const filteredProducts = products.filter((p) => {
    if (filterBy) {
      if (!(p.suggested_by_handle ?? "").toLowerCase().includes(filterBy.toLowerCase())) return false;
    }
    return true;
  });

  async function handleReview(id: string, action: "approve" | "reject") {
    const token = getAdminToken();
    if (!token) return;
    setReviewingId(id);
    setActionMenuId(null);
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
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setTotal((t) => Math.max(0, t - 1));
        load(false);
        window.dispatchEvent(new CustomEvent("admin:refetch-counts"));
      } else {
        toast("Action failed", "error");
      }
    } catch {
      toast("Action failed", "error");
    } finally {
      setReviewingId(null);
    }
  }

  function openAddModal() {
    setAddForm(ADD_FORM_EMPTY);
    setShowAddConfirm(false);
    setShowAddModal(true);
  }

  function handleAddSubmit() {
    if (!addForm.name_ar?.trim()) {
      toast("Name (Arabic) is required", "error");
      return;
    }
    if (!addForm.category_id?.trim()) {
      toast("Please select a category", "error");
      return;
    }
    const unitSize = Number(addForm.unit_size);
    if (Number.isNaN(unitSize) || unitSize < 0) {
      toast("Unit size must be a non-negative number", "error");
      return;
    }
    setShowAddConfirm(true);
  }

  async function confirmAddSubmit() {
    const token = getAdminToken();
    if (!token) {
      toast("Login required", "error");
      return;
    }
    setAddSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name_ar: addForm.name_ar.trim(),
          name_en: addForm.name_en?.trim() || undefined,
          category_id: addForm.category_id,
          unit: addForm.unit?.trim() || undefined,
          unit_size: Math.max(0, Math.floor(Number(addForm.unit_size) || 0)),
          status: "pending_review",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast("Suggestion added", "success");
        setShowAddModal(false);
        setShowAddConfirm(false);
        setAddForm(ADD_FORM_EMPTY);
        load();
        window.dispatchEvent(new CustomEvent("admin:refetch-counts"));
      } else {
        toast(data?.message ?? "Failed to add", "error");
      }
    } catch {
      toast("Failed to add", "error");
    } finally {
      setAddSaving(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
        <div className="border-b border-[#243040] px-5 py-4">
          <div className="text-[13px] font-semibold text-[#D8E4F0]">Pending Product Suggestions</div>
          <div className="text-[11px] text-[#4E6070] mt-0.5">{total} awaiting verification</div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full min-w-[480px]">
              <thead className="sticky top-0 bg-[#111820] z-10">
                <tr className="border-b border-[#243040]">
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-12">#</th>
                  {/* Product with funnel filter */}
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                    <div className="relative inline-flex items-center gap-1">
                      Product
                      <button onClick={() => setOpenFilter(openFilter === "product" ? null : "product")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${filterProduct ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                      </button>
                      {openFilter === "product" && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                          <div className="absolute left-0 top-full mt-1 z-30 w-48 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl p-2">
                            <input autoFocus type="text" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} placeholder="Filter product..." className="w-full h-[30px] rounded-md border border-[#243040] bg-[#111820] px-2 text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] font-normal normal-case tracking-normal" />
                            {filterProduct && (<button onClick={() => { setFilterProduct(""); setOpenFilter(null); }} className="mt-1.5 w-full text-center text-[10px] text-[#4E6070] hover:text-[#D8E4F0]">Clear</button>)}
                          </div>
                        </>
                      )}
                    </div>
                  </th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Suggested</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Status</th>
                  {/* By with funnel filter */}
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                    <div className="relative inline-flex items-center gap-1">
                      By
                      <button onClick={() => setOpenFilter(openFilter === "by" ? null : "by")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${filterBy ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                      </button>
                      {openFilter === "by" && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                          <div className="absolute left-0 top-full mt-1 z-30 w-48 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl p-2">
                            <input autoFocus type="text" value={filterBy} onChange={(e) => setFilterBy(e.target.value)} placeholder="Filter by..." className="w-full h-[30px] rounded-md border border-[#243040] bg-[#111820] px-2 text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] font-normal normal-case tracking-normal" />
                            {filterBy && (<button onClick={() => { setFilterBy(""); setOpenFilter(null); }} className="mt-1.5 w-full text-center text-[10px] text-[#4E6070] hover:text-[#D8E4F0]">Clear</button>)}
                          </div>
                        </>
                      )}
                    </div>
                  </th>
                  {/* Actions with + button */}
                  <th className="px-5 py-2.5 text-center">
                    <button onClick={openAddModal} className="w-7 h-7 rounded-full bg-[#4A7C59] text-white hover:bg-[#3A6347] transition-colors inline-flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-[#4E6070]">{filterProduct || filterBy ? "No suggestions match filters." : "No pending suggestions"}</td></tr>
                ) : filteredProducts.map((p, i) => (
                  <tr key={p.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                    <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">{offset + i + 1}</td>
                    <td className="px-5 py-3">
                      <div>
                        <div className="text-xs font-medium text-[#D8E4F0]">{p.name_ar}</div>
                        <div className="text-[10px] text-[#4E6070]">{p.category?.name_ar ?? "—"}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {p.pending_price != null ? `₪ ${p.pending_price}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-full border border-[#D4913A35] bg-[#D4913A18] px-2.5 py-0.5 text-[10px] font-medium text-[#E8B870]">🟡 Pending</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-[#8FA3B8]">{p.suggested_by_handle ?? "—"}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="relative inline-block">
                        <button onClick={() => setActionMenuId(actionMenuId === p.id ? null : p.id)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] transition-colors cursor-pointer">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        {actionMenuId === p.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setActionMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 z-30 w-36 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                              <button onClick={() => handleReview(p.id, "approve")} disabled={reviewingId === p.id} className="w-full text-left px-3 py-1.5 text-xs text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Approve</button>
                              <button onClick={() => handleReview(p.id, "reject")} disabled={reviewingId === p.id} className="w-full text-left px-3 py-1.5 text-xs text-[#D49088] hover:bg-[#243040] disabled:opacity-50">Reject</button>
                            </div>
                          </>
                        )}
                      </div>
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

      {/* Add modal — keep exactly as-is */}
      {showAddModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            aria-hidden
            onClick={() => !addSaving && !showAddConfirm && setShowAddModal(false)}
          />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-4">Add Suggestion</h3>
            {!showAddConfirm ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Name (Arabic) *</label>
                    <input
                      type="text"
                      value={addForm.name_ar}
                      onChange={(e) => setAddForm((f) => ({ ...f, name_ar: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                      placeholder="اسم المنتج"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Name (English)</label>
                    <input
                      type="text"
                      value={addForm.name_en}
                      onChange={(e) => setAddForm((f) => ({ ...f, name_en: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                      placeholder="Product name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Category *</label>
                    <select
                      value={addForm.category_id}
                      onChange={(e) => setAddForm((f) => ({ ...f, category_id: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    >
                      <option value="">Select category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name_ar}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Unit</label>
                    <select
                      value={addForm.unit || "كغ"}
                      onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    >
                      {PRODUCT_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Quantity *</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={addForm.unit_size}
                      onChange={(e) => setAddForm((f) => ({ ...f, unit_size: parseInt(e.target.value, 10) || 0 }))}
                      placeholder="0-9"
                      dir="ltr"
                      lang="en"
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    />
                    <p className="mt-1 text-[10px] text-[#4E6070]">Use English digits (0-9) only</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSubmit}
                    className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]"
                  >
                    Add
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[#D8E4F0] mb-4">Are you sure you want to add this suggestion? It will appear in the pending list for review.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddConfirm(false)}
                    disabled={addSaving}
                    className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={confirmAddSubmit}
                    disabled={addSaving}
                    className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347] disabled:opacity-50"
                  >
                    {addSaving ? "..." : "Yes, Add"}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
