"use client";

import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";
import { EditIcon, RemoveIcon } from "@/components/admin/AdminActionIcons";

type Area = {
  id: string;
  name_ar: string;
  governorate?: string | null;
  is_active?: boolean;
  active_reports_count?: number;
};

const FORM_EMPTY = { name_ar: "", governorate: "", is_active: true };

export default function AdminAreasPage() {
  const { toast } = useAdminToast();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [formSaving, setFormSaving] = useState(false);
  const [showFormConfirm, setShowFormConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/areas")
      .then((r) => r.json())
      .then((d) => setAreas(d?.areas ?? []))
      .catch(() => setAreas([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openAddModal() {
    setFormMode("add");
    setEditingArea(null);
    setForm(FORM_EMPTY);
    setShowFormConfirm(false);
    setShowFormModal(true);
  }

  function openEditModal(area: Area) {
    setFormMode("edit");
    setEditingArea(area);
    setForm({
      name_ar: area.name_ar ?? "",
      governorate: area.governorate ?? "",
      is_active: area.is_active ?? true,
    });
    setShowFormConfirm(false);
    setShowFormModal(true);
  }

  function handleFormSubmit() {
    if (!form.name_ar?.trim()) {
      toast("الاسم بالعربية مطلوب", "error");
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
      is_active: form.is_active,
    };
    if (form.governorate?.trim()) payload.governorate = form.governorate.trim();

    try {
      if (formMode === "add") {
        const res = await fetch("/api/admin/areas", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data?.message ?? "فشل الإضافة", "error");
          return;
        }
        toast("تمت إضافة المنطقة بنجاح", "success");
      } else if (editingArea) {
        const res = await fetch(`/api/admin/areas/${editingArea.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data?.message ?? "فشل التحديث", "error");
          return;
        }
        toast("تم تحديث المنطقة بنجاح", "success");
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

  async function confirmDelete() {
    if (!deleteTarget) return;
    const token = getStoredToken();
    if (!token) {
      toast("يجب تسجيل الدخول", "error");
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/areas/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast("تم حذف المنطقة بنجاح", "success");
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

  const filteredAreas = search.trim()
    ? areas.filter(
        (a) =>
          (a.name_ar?.toLowerCase() ?? "").includes(search.trim().toLowerCase()) ||
          (a.governorate?.toLowerCase() ?? "").includes(search.trim().toLowerCase())
      )
    : areas;

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search areas or governorate..."
          className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] min-w-[200px]"
        />
        <button
          onClick={openAddModal}
          className="ml-auto rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]"
        >
          + Add Area
        </button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
          </div>
        ) : filteredAreas.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#4E6070]">
            {search.trim() ? "No areas match your search." : "No areas"}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-[#243040]">
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-12">#</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Area</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Governorate</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Active Reports</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAreas.map((a, i) => (
                  <tr key={a.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                    <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">{i + 1}</td>
                    <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{a.name_ar}</td>
                    <td className="px-5 py-3 text-xs text-[#8FA3B8]">{a.governorate ?? "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs">{a.active_reports_count ?? 0}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 flex-wrap items-center">
                        <button onClick={() => openEditModal(a)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#64748B] bg-[#334155] px-3 py-1.5 text-xs font-medium text-[#94A3B8] hover:bg-[#475569] hover:border-[#64748B] transition-colors"><EditIcon />Edit</button>
                        <button onClick={() => setDeleteTarget(a)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#A85852] bg-[#A8585218] px-3 py-1.5 text-xs font-medium text-[#D49088] hover:bg-[#A8585228] hover:border-[#A85852] transition-colors"><RemoveIcon />Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showFormModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !showFormConfirm && setShowFormModal(false)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-4">{formMode === "add" ? "Add Area" : "Edit Area"}</h3>
            {!showFormConfirm ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Name (Arabic) *</label>
                    <input type="text" value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]" placeholder="اسم المنطقة" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Governorate</label>
                    <select value={form.governorate} onChange={(e) => setForm((f) => ({ ...f, governorate: e.target.value }))} className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]">
                      <option value="">—</option>
                      <option value="north">North</option>
                      <option value="central">Central</option>
                      <option value="south">South</option>
                    </select>
                  </div>
                  {formMode === "edit" && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="area-active" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                      <label htmlFor="area-active" className="text-sm text-[#8FA3B8]">Active</label>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={() => setShowFormModal(false)} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040]">Cancel</button>
                  <button type="button" onClick={handleFormSubmit} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]">{formMode === "add" ? "Add Area" : "Save Changes"}</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[#D8E4F0] mb-4">{formMode === "add" ? "Are you sure you want to add this area?" : "Are you sure you want to save these changes?"}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowFormConfirm(false)} disabled={formSaving} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Back</button>
                  <button type="button" onClick={confirmFormSubmit} disabled={formSaving} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347] disabled:opacity-50">{formSaving ? "..." : formMode === "add" ? "Yes, Add" : "Yes, Save"}</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !deleteLoading && setDeleteTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-2">Remove Area</h3>
            <p className="text-sm text-[#8FA3B8] mb-4">Are you sure you want to delete &ldquo;{deleteTarget.name_ar}&rdquo;? This action cannot be undone.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleteLoading} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmDelete} disabled={deleteLoading} className="flex-1 rounded-lg border border-[#A85852] bg-[#A8585218] px-4 py-2 text-sm font-medium text-[#D49088] hover:bg-[#A8585228] disabled:opacity-50 transition-colors">{deleteLoading ? "..." : "Yes, Remove"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
