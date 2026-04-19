"use client";

import { useEffect, useState } from "react";
import { getAdminToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useIsSuperAdmin } from "@/components/admin/AdminLayout";

type Category = {
  id: string;
  name_ar: string;
  name_en?: string;
  icon?: string;
  sort_order?: number;
  section_id?: string | null;
  section?: { id: string; name_ar: string; icon?: string | null } | null;
};

type Section = {
  id: string;
  name_ar: string;
  icon?: string | null;
  sort_order?: number;
};

const EMPTY_FORM = {
  name_ar: "",
  name_en: "",
  icon: "",
  section_id: "",
  sort_order: 0,
};

export default function AdminCategoriesPage() {
  const { toast } = useAdminToast();
  const isSuperAdmin = useIsSuperAdmin();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [filterName, setFilterName] = useState("");
  const [filterSectionName, setFilterSectionName] = useState("");

  // Kebab menu
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

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
  const [sections, setSections] = useState<Section[]>([]);

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

  useEffect(() => {
    fetch("/api/sections")
      .then((r) => r.json())
      .then((d) => setSections(Array.isArray(d) ? d : []))
      .catch(() => setSections([]));
  }, []);

  const filteredCategories = categories.filter((c) => {
    if (filterName) {
      const q = filterName.toLowerCase();
      if (!(c.name_ar ?? "").toLowerCase().includes(q) && !(c.name_en ?? "").toLowerCase().includes(q)) return false;
    }
    if (filterSectionName && !(c.section?.name_ar ?? "").toLowerCase().includes(filterSectionName.toLowerCase())) return false;
    return true;
  });

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
      section_id: category.section_id ?? category.section?.id ?? "",
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
    const token = getAdminToken();
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
    if (form.section_id?.trim()) payload.section_id = form.section_id.trim();
    else payload.section_id = null;

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
        const created = data as Category;
        const enriched: Category = {
          ...created,
          section: created.section ?? (created.section_id ? sections.find((s) => s.id === created.section_id) ?? null : null),
        };
        setCategories((prev) =>
          [...prev, enriched].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        );
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
        const updated = data as Category;
        const enriched: Category = {
          ...updated,
          section: updated.section ?? (updated.section_id ? sections.find((s) => s.id === updated.section_id) ?? null : null),
        };
        setCategories((prev) =>
          prev
            .map((c) => (c.id === editingCategory.id ? { ...c, ...enriched } : c))
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
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

  function openDeleteModal(category: Category) {
    setDeleteTarget(category);
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
      const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast("تم حذف التصنيف بنجاح", "success");
        const removedId = deleteTarget.id;
        setDeleteTarget(null);
        setCategories((prev) => prev.filter((c) => c.id !== removedId));
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
      <div className="flex-1 min-h-0 overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
        <div className="overflow-x-auto overflow-y-auto h-full">
          <table className="w-full min-w-[400px]">
            <thead className="sticky top-0 z-10 bg-[#111820]">
              <tr className="border-b border-[#243040]">
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-12">#</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Icon</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                  <div className="relative inline-flex items-center gap-1">
                    Name
                    <button onClick={() => setOpenFilter(openFilter === "name" ? null : "name")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${filterName ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                    </button>
                    {openFilter === "name" && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                        <div className="absolute left-0 top-full mt-1 z-30 w-48 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl p-2">
                          <input autoFocus type="text" value={filterName} onChange={(e) => setFilterName(e.target.value)} placeholder="Filter name..." className="w-full h-[30px] rounded-md border border-[#243040] bg-[#111820] px-2 text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] font-normal normal-case tracking-normal" />
                          {filterName && (<button onClick={() => { setFilterName(""); setOpenFilter(null); }} className="mt-1.5 w-full text-center text-[10px] text-[#4E6070] hover:text-[#D8E4F0]">Clear</button>)}
                        </div>
                      </>
                    )}
                  </div>
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                  <div className="relative inline-flex items-center gap-1">
                    Section
                    <button onClick={() => setOpenFilter(openFilter === "section" ? null : "section")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${filterSectionName ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                    </button>
                    {openFilter === "section" && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                        <div className="absolute left-0 top-full mt-1 z-30 w-48 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl p-2">
                          <input autoFocus type="text" value={filterSectionName} onChange={(e) => setFilterSectionName(e.target.value)} placeholder="Filter section..." className="w-full h-[30px] rounded-md border border-[#243040] bg-[#111820] px-2 text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] font-normal normal-case tracking-normal" />
                          {filterSectionName && (<button onClick={() => { setFilterSectionName(""); setOpenFilter(null); }} className="mt-1.5 w-full text-center text-[10px] text-[#4E6070] hover:text-[#D8E4F0]">Clear</button>)}
                        </div>
                      </>
                    )}
                  </div>
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Order</th>
                <th className="px-5 py-2.5 text-center">
                  <button onClick={openAddModal} className="w-7 h-7 rounded-full bg-[#4A7C59] text-white hover:bg-[#3A6347] transition-colors inline-flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-[#4E6070]">
                    {filterName || filterSectionName ? "No categories match your filters." : "No categories"}
                  </td>
                </tr>
              ) : (
                filteredCategories.map((c, i) => (
                  <tr key={c.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                    <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">{i + 1}</td>
                    <td className="px-5 py-3 text-lg">{c.icon ?? "—"}</td>
                    <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{c.name_ar}</td>
                    <td className="px-5 py-3 text-xs text-[#8FA3B8]">{c.section?.name_ar ?? "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[#4E6070]">{c.sort_order ?? "—"}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === c.id ? null : c.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] transition-colors cursor-pointer"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        {actionMenuId === c.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setActionMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 z-30 w-36 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                              <button
                                onClick={() => { setActionMenuId(null); openEditModal(c); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#D8E4F0] hover:bg-[#243040] transition-colors"
                              >
                                Edit
                              </button>
                              {isSuperAdmin && <button
                                onClick={() => { setActionMenuId(null); openDeleteModal(c); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#D49088] hover:bg-[#243040] transition-colors"
                              >
                                Remove
                              </button>}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                    <label className="block text-xs text-[#4E6070] mb-1">Section</label>
                    <select
                      value={form.section_id}
                      onChange={(e) => setForm((f) => ({ ...f, section_id: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    >
                      <option value="">No section</option>
                      {[...sections]
                        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ""}{s.name_ar}</option>
                        ))}
                    </select>
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
