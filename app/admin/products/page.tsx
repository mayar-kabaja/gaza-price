"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getStoredToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";

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
  unit: "",
  unit_size: 1,
};

export default function AdminProductsPage() {
  const { toast } = useAdminToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const prevSearchRef = useRef(search);
  const limit = 20;

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

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset), all: "1" });
    if (search.trim()) params.set("search", search.trim());
    fetch(`/api/products?${params.toString()}`)
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
    if (prevSearchRef.current !== search) {
      prevSearchRef.current = search;
      setOffset(0);
      return;
    }
    load();
  }, [search, offset]);

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
        unit: p.unit ?? "",
        unit_size: typeof p.unit_size === "number" ? p.unit_size : 1,
      });
    } catch {
      setForm({
        name_ar: product.name_ar ?? "",
        name_en: product.name_en ?? "",
        category_id: "",
        unit: product.unit ?? "",
        unit_size: product.unit_size ?? 1,
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
    const unitSize = Number(form.unit_size);
    if (Number.isNaN(unitSize) || unitSize < 0) {
      toast("وحدة القياس يجب أن تكون رقماً موجباً", "error");
      return;
    }
    setShowFormConfirm(true);
  }

  async function confirmFormSubmit() {
    const token = getStoredToken();
    if (!token) {
      toast("يجب تسجيل الدخول", "error");
      return;
    }
    setFormSaving(true);
    const payload = {
      name_ar: form.name_ar.trim(),
      category_id: form.category_id,
      unit_size: Number(form.unit_size),
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
      }
      setShowFormConfirm(false);
      setShowFormModal(false);
      load();
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
    const token = getStoredToken();
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
        setDeleteTarget(null);
        load();
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
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search products (optional)..."
          className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
        />
        <button
          onClick={() => load()}
          className="rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]"
        >
          Search
        </button>
        <button
          onClick={openAddModal}
          className="rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]"
        >
          + Add Product
        </button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#4E6070]">
            {search.trim() ? "No products found. Try a different search." : "No products yet."}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-[#243040]">
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Product</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Category</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Unit</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                    <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{p.name_ar}</td>
                    <td className="px-5 py-3 text-xs text-[#8FA3B8]">{p.category?.name_ar ?? "—"}</td>
                    <td className="px-5 py-3 text-xs text-[#4E6070]">{p.unit ?? "—"} {p.unit_size ?? ""}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 items-center flex-wrap">
                        <Link
                          href={`/product/${p.id}`}
                          target="_blank"
                          className="text-[11px] text-[#6BA880] hover:underline"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => openEditModal(p)}
                          className="text-[11px] text-[#8FA3B8] hover:text-[#D8E4F0] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(p)}
                          className="text-[11px] text-[#E05A4E] hover:text-red-400 hover:underline"
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
                    <label className="block text-xs text-[#4E6070] mb-1">Unit (e.g. kg, L)</label>
                    <input
                      type="text"
                      value={form.unit}
                      onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                      placeholder="وحدة القياس"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Unit size *</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.unit_size}
                      onChange={(e) => setForm((f) => ({ ...f, unit_size: parseFloat(e.target.value) || 0 }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    />
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
                className="flex-1 rounded-lg bg-[#E05A4E] px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
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
