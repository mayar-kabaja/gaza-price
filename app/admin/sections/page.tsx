"use client";

import { useEffect, useState, useRef } from "react";
import { getAdminToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useIsSuperAdmin } from "@/components/admin/AdminLayout";

type Section = {
  id: string;
  name_ar: string;
  icon?: string | null;
  sort_order?: number;
  categories?: { id: string }[];
};

const EMPTY_FORM = {
  name_ar: "",
  icon: "",
  sort_order: 0,
};

export default function AdminSectionsPage() {
  const { toast } = useAdminToast();
  const isSuperAdmin = useIsSuperAdmin();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [filterSection, setFilterSection] = useState("");
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [showFormConfirm, setShowFormConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);

  function load() {
    setLoading(true);
    fetch("/api/sections")
      .then((r) => r.json())
      .then((d) => setSections(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (openFilter && filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
      if (actionMenuId && actionRef.current && !actionRef.current.contains(e.target as Node)) {
        setActionMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openFilter, actionMenuId]);

  const filteredSections = sections.filter((s) => {
    if (filterSection && !(s.name_ar ?? "").toLowerCase().includes(filterSection.toLowerCase())) return false;
    return true;
  });

  function openAddModal() {
    setFormMode("add");
    setEditingSection(null);
    setForm(EMPTY_FORM);
    setShowFormConfirm(false);
    setShowFormModal(true);
  }

  function openEditModal(section: Section) {
    setFormMode("edit");
    setEditingSection(section);
    setForm({
      name_ar: section.name_ar ?? "",
      icon: section.icon ?? "",
      sort_order: typeof section.sort_order === "number" ? section.sort_order : 0,
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
    if (form.icon?.trim()) payload.icon = form.icon.trim();

    try {
      if (formMode === "add") {
        const res = await fetch("/api/admin/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data?.message ?? "فشل الإضافة", "error");
          return;
        }
        toast("تمت إضافة القسم بنجاح", "success");
        window.dispatchEvent(new CustomEvent("admin:refetch-counts"));
        const created = data as Section;
        setSections((prev) =>
          [...prev, created].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        );
      } else if (editingSection) {
        const res = await fetch(`/api/admin/sections/${editingSection.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data?.message ?? "فشل التحديث", "error");
          return;
        }
        toast("تم تحديث القسم بنجاح", "success");
        window.dispatchEvent(new CustomEvent("admin:refetch-counts"));
        const updated = data as Section;
        setSections((prev) =>
          prev
            .map((s) => (s.id === editingSection.id ? { ...s, ...updated } : s))
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

  async function confirmDelete() {
    if (!deleteTarget) return;
    const token = getAdminToken();
    if (!token) {
      toast("يجب تسجيل الدخول", "error");
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/sections/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast("تم حذف القسم بنجاح", "success");
        window.dispatchEvent(new CustomEvent("admin:refetch-counts"));
        const removedId = deleteTarget.id;
        setDeleteTarget(null);
        setSections((prev) => prev.filter((s) => s.id !== removedId));
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
                  <div className="relative inline-flex items-center gap-1.5">
                    Section
                    <button
                      onClick={() => setOpenFilter(openFilter === "section" ? null : "section")}
                      className={`p-0.5 rounded transition-colors ${filterSection ? "text-[#4A7C59]" : "text-[#4E6070] hover:text-[#8FA3B8]"}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                    </button>
                    {openFilter === "section" && (
                      <div ref={filterRef} className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-[#243040] bg-[#18212C] p-2 shadow-xl z-20">
                        <input
                          autoFocus
                          type="text"
                          value={filterSection}
                          onChange={(e) => setFilterSection(e.target.value)}
                          placeholder="Filter section..."
                          className="w-full rounded border border-[#243040] bg-[#111820] px-2 py-1 text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
                        />
                        {filterSection && (
                          <button
                            onClick={() => { setFilterSection(""); setOpenFilter(null); }}
                            className="mt-1 text-[10px] text-[#4E6070] hover:text-[#D8E4F0]"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Categories</th>
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
                    <div className="flex justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : filteredSections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-[#4E6070]">
                    {filterSection ? "No sections match your filter." : "No sections"}
                  </td>
                </tr>
              ) : (
                filteredSections.map((s, i) => (
                  <tr key={s.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                    <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">{i + 1}</td>
                    <td className="px-5 py-3 text-lg">{s.icon ?? "—"}</td>
                    <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{s.name_ar}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[#4E6070]">{s.categories?.length ?? 0}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[#4E6070]">{s.sort_order ?? "—"}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="relative" ref={actionMenuId === s.id ? actionRef : undefined}>
                        <button
                          onClick={() => setActionMenuId(actionMenuId === s.id ? null : s.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] transition-colors cursor-pointer"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                        {actionMenuId === s.id && (
                          <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-[#243040] bg-[#18212C] py-1 shadow-xl z-20">
                            <button
                              onClick={() => { openEditModal(s); setActionMenuId(null); }}
                              className="w-full px-3 py-1.5 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] transition-colors"
                            >
                              Edit
                            </button>
                            {isSuperAdmin && <button
                              onClick={() => { setDeleteTarget(s); setActionMenuId(null); }}
                              className="w-full px-3 py-1.5 text-left text-xs text-[#D49088] hover:bg-[#243040] transition-colors"
                            >
                              Remove
                            </button>}
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
      </div>

      {/* Add / Edit modal */}
      {showFormModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !showFormConfirm && setShowFormModal(false)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-4">{formMode === "add" ? "Add Section" : "Edit Section"}</h3>
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
                      placeholder="اسم القسم"
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
                  <button type="button" onClick={() => setShowFormModal(false)} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040]">Cancel</button>
                  <button type="button" onClick={handleFormSubmit} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]">{formMode === "add" ? "Add Section" : "Save Changes"}</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[#D8E4F0] mb-4">{formMode === "add" ? "Are you sure you want to add this section?" : "Are you sure you want to save these changes?"}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowFormConfirm(false)} disabled={formSaving} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Back</button>
                  <button type="button" onClick={confirmFormSubmit} disabled={formSaving} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347] disabled:opacity-50">{formSaving ? "..." : formMode === "add" ? "Yes, Add" : "Yes, Save"}</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !deleteLoading && setDeleteTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-2">Remove Section</h3>
            <p className="text-sm text-[#8FA3B8] mb-4">Are you sure you want to delete &ldquo;{deleteTarget.name_ar}&rdquo;? Categories in this section will become unassigned.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleteLoading} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmDelete} disabled={deleteLoading} className="flex-1 rounded-lg border border-[#A85852] bg-[#A8585218] px-4 py-2 text-sm font-medium text-[#D49088] hover:bg-[#A8585228] disabled:opacity-50">{deleteLoading ? "..." : "Yes, Remove"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
