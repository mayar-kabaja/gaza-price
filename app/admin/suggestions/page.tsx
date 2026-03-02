"use client";

import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth/token";
import { apiFetch } from "@/lib/api/fetch";
import { useAdminToast } from "@/components/admin/AdminToast";
import { ApproveIcon, RejectIcon } from "@/components/admin/AdminActionIcons";

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

const PAGE_SIZE = 50;
const ADD_FORM_EMPTY = { name_ar: "", name_en: "", category_id: "", unit: "", unit_size: 1 };

export default function AdminSuggestionsPage() {
  const { toast } = useAdminToast();
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(ADD_FORM_EMPTY);
  const [addSaving, setAddSaving] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  function load() {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch(`/api/admin/products/pending?limit=${PAGE_SIZE}&offset=${offset}`)
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
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => setCategories([]));
  }, []);

  const filteredProducts = search.trim()
    ? products.filter((p) => {
        const q = search.trim().toLowerCase();
        const name = (p.name_ar ?? "").toLowerCase();
        const category = (p.category?.name_ar ?? "").toLowerCase();
        const by = (p.suggested_by_handle ?? "").toLowerCase();
        const price = String(p.pending_price ?? "");
        return name.includes(q) || category.includes(q) || by.includes(q) || price.includes(q);
      })
    : products;

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
    const token = getStoredToken();
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
          unit_size: Math.max(0, Number(addForm.unit_size) || 0),
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
      } else {
        toast(data?.message ?? "Failed to add", "error");
      }
    } catch {
      toast("Failed to add", "error");
    } finally {
      setAddSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, category, or suggested by..."
            className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] min-w-[200px]"
          />
          <button
            onClick={openAddModal}
            className="ml-auto rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]"
          >
            + Add Suggestion
          </button>
        </div>
        <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
          <div className="border-b border-[#243040] px-5 py-4">
            <div className="text-[13px] font-semibold text-[#D8E4F0]">Pending Product Suggestions</div>
            <div className="text-[11px] text-[#4E6070] mt-0.5">{total} awaiting verification</div>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4E6070]">
              {search.trim() ? "No suggestions match your search." : "No pending suggestions"}
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#243040]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-12">#</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Product</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Suggested</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Status</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">By</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, i) => (
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
                        <span className="inline-flex items-center rounded-full border border-[#D4913A35] bg-[#D4913A18] px-2.5 py-0.5 text-[10px] font-medium text-[#E8B870]">Pending</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-[#8FA3B8]">{p.suggested_by_handle ?? "—"}</td>
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

      {/* Add modal */}
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
                    <input
                      type="text"
                      value={addForm.unit}
                      onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                      placeholder="kg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Unit size</label>
                    <input
                      type="number"
                      min={0}
                      value={addForm.unit_size}
                      onChange={(e) => setAddForm((f) => ({ ...f, unit_size: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    />
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
