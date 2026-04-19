"use client";

import { useEffect, useState } from "react";
import { getAdminToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useIsSuperAdmin } from "@/components/admin/AdminLayout";
import { PRODUCT_UNITS } from "@/lib/constants";

type Category = {
  id: string;
  name_ar: string;
  icon?: string;
  sort_order?: number;
};

type Product = {
  id: string;
  name_ar: string;
  name_en?: string;
  unit?: string;
  unit_size?: number;
  category_id?: string;
  category?: { name_ar: string; icon?: string };
};

const EMPTY_FORM = {
  name_ar: "",
  name_en: "",
  category_id: "",
  unit: "كغ",
  unit_size: 1,
};

export default function AdminProductsPage() {
  const { toast } = useAdminToast();
  const isSuperAdmin = useIsSuperAdmin();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const limit = 20;

  // Filter states
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [filterProduct, setFilterProduct] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Add / Edit modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [showFormConfirm, setShowFormConfirm] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function load(overrideOffset?: number) {
    setLoading(true);
    const off = overrideOffset ?? offset;
    const params = new URLSearchParams({ limit: String(limit), offset: String(off), all: "1" });
    if (filterProduct.trim()) params.set("search", filterProduct.trim());
    fetch(`/api/products?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setProducts(d?.products ?? []);
        setTotal(d?.total ?? 0);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    load();
  }, [offset]);

  // Debounce filterProduct to trigger server-side search
  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(0);
      load(0);
    }, 300);
    return () => clearTimeout(t);
  }, [filterProduct]);

  const filteredProducts = products.filter((p) => {
    if (filterCategory && !(p.category?.name_ar ?? "").toLowerCase().includes(filterCategory.toLowerCase())) return false;
    return true;
  });

  function openAddModal() {
    setFormMode("add");
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setShowFormConfirm(false);
    setShowFormModal(true);
  }

  async function openEditModal(product: Product) {
    setFormMode("edit");
    setEditingProduct(product);
    setShowFormConfirm(false);
    setShowFormModal(true);
    // Fetch full product for category_id
    try {
      const res = await fetch(`/api/products/${product.id}`);
      const p = await res.json();
      setForm({
        name_ar: p.name_ar ?? "",
        name_en: p.name_en ?? "",
        category_id: p.category_id ?? "",
        unit: p.unit ?? "كغ",
        unit_size: typeof p.unit_size === "number" ? Math.floor(p.unit_size) : 1,
      });
    } catch {
      setForm({
        name_ar: product.name_ar ?? "",
        name_en: product.name_en ?? "",
        category_id: "",
        unit: product.unit ?? "كغ",
        unit_size: typeof product.unit_size === "number" ? Math.floor(product.unit_size) : 1,
      });
    }
  }

  function handleFormSubmit() {
    if (!form.name_ar?.trim()) {
      toast("الاسم بالعربية مطلوب", "error");
      return;
    }
    if (!form.category_id?.trim()) {
      toast("يرجى اختيار التصنيف", "error");
      return;
    }
    const unitSize = Math.floor(Number(form.unit_size));
    if (Number.isNaN(unitSize) || unitSize < 0) {
      toast("الكمية يجب أن تكون رقماً صحيحاً موجباً", "error");
      return;
    }
    setShowFormConfirm(true);
  }

  async function confirmFormSubmit() {
    const token = getAdminToken();
    if (!token) {
      toast("يجب تسجيل الدخول", "error");
      return;
    }
    setFormSaving(true);
    const payload = {
      name_ar: form.name_ar.trim(),
      category_id: form.category_id,
      unit_size: Math.max(0, Math.floor(Number(form.unit_size) || 0)),
    };
    if (form.name_en?.trim()) (payload as Record<string, unknown>).name_en = form.name_en.trim();
    if (form.unit?.trim()) (payload as Record<string, unknown>).unit = form.unit.trim();

    try {
      if (formMode === "add") {
        (payload as Record<string, unknown>).status = "active";
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data?.message ?? "فشل الإضافة", "error");
          return;
        }
        toast("تمت إضافة المنتج بنجاح", "success");
        const created = data as Product;
        const cat = categories.find((c) => c.id === form.category_id);
        setProducts((prev) => [
          { ...created, category: cat ? { name_ar: cat.name_ar, icon: cat.icon } : undefined },
          ...prev,
        ]);
        setTotal((t) => t + 1);
      } else if (editingProduct) {
        const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data?.message ?? "فشل التحديث", "error");
          return;
        }
        toast("تم تحديث المنتج بنجاح", "success");
        const updated = data as Product;
        const cat = categories.find((c) => c.id === form.category_id);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? { ...p, ...updated, category: cat ? { name_ar: cat.name_ar, icon: cat.icon } : p.category }
              : p
          )
        );
      }
      setShowFormConfirm(false);
      setShowFormModal(false);
    } catch {
      toast("حدث خطأ في الاتصال", "error");
    } finally {
      setFormSaving(false);
    }
  }

  function openDeleteModal(product: Product) {
    setDeleteTarget(product);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const token = getAdminToken();
    if (!token) {
      toast("يجب تسجيل الدخول", "error");
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast("تم حذف المنتج بنجاح", "success");
        const removedId = deleteTarget.id;
        setDeleteTarget(null);
        setProducts((prev) => prev.filter((p) => p.id !== removedId));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        const data = await res.json();
        toast(data?.message ?? "فشل الحذف", "error");
      }
    } catch {
      toast("حدث خطأ في الاتصال", "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full min-w-[560px]">
              <thead className="sticky top-0 bg-[#111820] z-10">
                <tr className="border-b border-[#243040]">
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-12">#</th>
                  {/* Product with funnel */}
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
                  {/* Category with funnel */}
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                    <div className="relative inline-flex items-center gap-1">
                      Category
                      <button onClick={() => setOpenFilter(openFilter === "category" ? null : "category")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${filterCategory ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                      </button>
                      {openFilter === "category" && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                          <div className="absolute left-0 top-full mt-1 z-30 w-48 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl p-2">
                            <input autoFocus type="text" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} placeholder="Filter category..." className="w-full h-[30px] rounded-md border border-[#243040] bg-[#111820] px-2 text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] font-normal normal-case tracking-normal" />
                            {filterCategory && (<button onClick={() => { setFilterCategory(""); setOpenFilter(null); }} className="mt-1.5 w-full text-center text-[10px] text-[#4E6070] hover:text-[#D8E4F0]">Clear</button>)}
                          </div>
                        </>
                      )}
                    </div>
                  </th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Unit</th>
                  {/* Actions with + */}
                  <th className="px-5 py-2.5 text-center">
                    <button onClick={openAddModal} className="w-7 h-7 rounded-full bg-[#4A7C59] text-white hover:bg-[#3A6347] transition-colors inline-flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-sm text-[#4E6070]">{filterProduct || filterCategory ? "No products match filters." : "No products yet."}</td></tr>
                ) : filteredProducts.map((p, i) => (
                  <tr key={p.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                    <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">{offset + i + 1}</td>
                    <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{p.name_ar}</td>
                    <td className="px-5 py-3 text-xs text-[#8FA3B8]">{p.category?.name_ar ?? "—"}</td>
                    <td className="px-5 py-3 text-xs text-[#4E6070]">{p.unit ?? "—"} {p.unit_size != null ? Math.floor(Number(p.unit_size)) : "—"}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="relative inline-block">
                        <button onClick={() => setActionMenuId(actionMenuId === p.id ? null : p.id)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] transition-colors cursor-pointer">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        {actionMenuId === p.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setActionMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 z-30 w-36 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                              <a href={`/product/${p.id}`} target="_blank" className="block w-full text-left px-3 py-1.5 text-xs text-[#D8E4F0] hover:bg-[#243040]">View</a>
                              <button onClick={() => { setActionMenuId(null); openEditModal(p); }} className="w-full text-left px-3 py-1.5 text-xs text-[#D8E4F0] hover:bg-[#243040]">Edit</button>
                              {isSuperAdmin && <button onClick={() => { setActionMenuId(null); openDeleteModal(p); }} className="w-full text-left px-3 py-1.5 text-xs text-[#D49088] hover:bg-[#243040]">Remove</button>}
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

      {/* Add / Edit form modal */}
      {showFormModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            aria-hidden
            onClick={() => !showFormConfirm && setShowFormModal(false)}
          />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-4">
              {formMode === "add" ? "Add Product" : "Edit Product"}
            </h3>

            {!showFormConfirm ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Name (Arabic) *</label>
                    <input
                      type="text"
                      value={form.name_ar}
                      onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                      placeholder="اسم المنتج"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Name (English)</label>
                    <input
                      type="text"
                      value={form.name_en}
                      onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                      placeholder="Product name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Category *</label>
                    <select
                      value={form.category_id}
                      onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    >
                      <option value="">اختر التصنيف</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name_ar}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Unit</label>
                    <select
                      value={form.unit || "كغ"}
                      onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    >
                      {PRODUCT_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                      {form.unit && !PRODUCT_UNITS.some((u) => u.value === form.unit) && (
                        <option value={form.unit}>{form.unit}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Quantity *</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={form.unit_size}
                      onChange={(e) => setForm((f) => ({ ...f, unit_size: parseInt(e.target.value, 10) || 0 }))}
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
                    onClick={() => setShowFormModal(false)}
                    className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleFormSubmit}
                    className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]"
                  >
                    {formMode === "add" ? "Add Product" : "Save Changes"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[#D8E4F0] mb-4">
                  {formMode === "add"
                    ? "Are you sure you want to add this product?"
                    : "Are you sure you want to save these changes?"}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFormConfirm(false)}
                    disabled={formSaving}
                    className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={confirmFormSubmit}
                    disabled={formSaving}
                    className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347] disabled:opacity-50"
                  >
                    {formSaving ? "..." : formMode === "add" ? "Yes, Add" : "Yes, Save"}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            aria-hidden
            onClick={() => !deleteLoading && setDeleteTarget(null)}
          />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-2">Remove Product</h3>
            <p className="text-sm text-[#8FA3B8] mb-4">
              Are you sure you want to delete &ldquo;{deleteTarget.name_ar}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="flex-1 rounded-lg border border-[#A85852] bg-[#A8585218] px-4 py-2 text-sm font-medium text-[#D49088] hover:bg-[#A8585228] disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? "..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
