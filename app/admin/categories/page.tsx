"use client";

import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";

type Category = {
  id: string;
  name_ar: string;
  name_en?: string;
  icon?: string;
  sort_order?: number;
};

const EMPTY_FORM = {
  name_ar: "",
  name_en: "",
  icon: "",
  sort_order: 0,
};

export default function AdminCategoriesPage() {
  const { toast } = useAdminToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [showFormConfirm, setShowFormConfirm] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openAddModal() {
    setFormMode("add");
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setShowFormConfirm(false);
    setShowFormModal(true);
  }

  function openEditModal(category: Category) {
    setFormMode("edit");
    setEditingCategory(category);
    setForm({
      name_ar: category.name_ar ?? "",
      name_en: category.name_en ?? "",
      icon: category.icon ?? "",
      sort_order: typeof category.sort_order === "number" ? category.sort_order : 0,
    });
    setShowFormConfirm(false);
    setShowFormModal(true);
  }

  function handleFormSubmit() {
    if (!form.name_ar?.trim()) {
      toast("الاسم بالعربية مطلوب", "error");
      return;
    }
    const sortOrder = Number(form.sort_order);
    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      toast("ترتيب العرض يجب أن يكون رقماً موجباً", "error");
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
    const payload: Record<string, unknown> = {
      name_ar: form.name_ar.trim(),
      sort_order: Math.floor(Number(form.sort_order) || 0),
    };
    if (form.name_en?.trim()) payload.name_en = form.name_en.trim();
    if (form.icon?.trim()) payload.icon = form.icon.trim();

    try {
      if (formMode === "add") {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data?.message ?? "فشل الإضافة", "error");
          return;
        }
        toast("تمت إضافة التصنيف بنجاح", "success");
      } else if (editingCategory) {
        const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data?.message ?? "فشل التحديث", "error");
          return;
        }
        toast("تم تحديث التصنيف بنجاح", "success");
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

  function openDeleteModal(category: Category) {
    setDeleteTarget(category);
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
      const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast("تم حذف التصنيف بنجاح", "success");
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
      <div className="mb-4">
        <button
          onClick={openAddModal}
          className="rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]"
        >
          + Add Category
        </button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
          </div>
        ) : categories.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#4E6070]">No categories</div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-[#243040]">
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Icon</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Name</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Order</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                    <td className="px-5 py-3 text-lg">{c.icon ?? "—"}</td>
                    <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{c.name_ar}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[#4E6070]">{c.sort_order ?? "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 items-center flex-wrap">
                        <button
                          onClick={() => openEditModal(c)}
                          className="text-[11px] text-[#8FA3B8] hover:text-[#D8E4F0] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(c)}
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
              {formMode === "add" ? "Add Category" : "Edit Category"}
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
                      placeholder="اسم التصنيف"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Name (English)</label>
                    <input
                      type="text"
                      value={form.name_en}
                      onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                      placeholder="Category name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Icon (emoji or char)</label>
                    <input
                      type="text"
                      value={form.icon}
                      onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                      placeholder="🛒"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Sort order</label>
                    <input
                      type="number"
                      min={0}
                      value={form.sort_order}
                      onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
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
                    {formMode === "add" ? "Add Category" : "Save Changes"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[#D8E4F0] mb-4">
                  {formMode === "add"
                    ? "Are you sure you want to add this category?"
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
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-2">Remove Category</h3>
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
