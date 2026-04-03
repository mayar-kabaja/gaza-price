"use client";

import { useEffect, useState } from "react";
import { getAdminToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";

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

  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState("");
  const [filterGov, setFilterGov] = useState("");
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

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
    const token = getAdminToken();
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
    const token = getAdminToken();
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
        const removedId = deleteTarget.id;
        setDeleteTarget(null);
        setAreas((prev) => prev.filter((a) => a.id !== removedId));
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

  const filteredAreas = areas.filter((a) => {
    if (filterArea && !(a.name_ar ?? "").toLowerCase().includes(filterArea.toLowerCase())) return false;
    if (filterGov && !(a.governorate ?? "").toLowerCase().includes(filterGov.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
        <div className="overflow-x-auto overflow-y-auto h-full">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-[#243040]">
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-12">#</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                  <div className="relative inline-flex items-center gap-1">
                    Area
                    <button onClick={() => setOpenFilter(openFilter === "area" ? null : "area")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${filterArea ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                    </button>
                    {openFilter === "area" && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                        <div className="absolute left-0 top-full mt-1 z-30 w-48 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl p-2">
                          <input autoFocus type="text" value={filterArea} onChange={(e) => setFilterArea(e.target.value)} placeholder="Filter area..." className="w-full h-[30px] rounded-md border border-[#243040] bg-[#111820] px-2 text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] font-normal normal-case tracking-normal" />
                          {filterArea && (<button onClick={() => { setFilterArea(""); setOpenFilter(null); }} className="mt-1.5 w-full text-center text-[10px] text-[#4E6070] hover:text-[#D8E4F0]">Clear</button>)}
                        </div>
                      </>
                    )}
                  </div>
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                  <div className="relative inline-flex items-center gap-1">
                    Governorate
                    <button onClick={() => setOpenFilter(openFilter === "gov" ? null : "gov")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${filterGov ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                    </button>
                    {openFilter === "gov" && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                        <div className="absolute left-0 top-full mt-1 z-30 w-48 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl p-2">
                          <input autoFocus type="text" value={filterGov} onChange={(e) => setFilterGov(e.target.value)} placeholder="Filter governorate..." className="w-full h-[30px] rounded-md border border-[#243040] bg-[#111820] px-2 text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] font-normal normal-case tracking-normal" />
                          {filterGov && (<button onClick={() => { setFilterGov(""); setOpenFilter(null); }} className="mt-1.5 w-full text-center text-[10px] text-[#4E6070] hover:text-[#D8E4F0]">Clear</button>)}
                        </div>
                      </>
                    )}
                  </div>
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Active Reports</th>
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
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : filteredAreas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-[#4E6070]">
                    {filterArea || filterGov ? "No areas match your filters." : "No areas"}
                  </td>
                </tr>
              ) : (
                filteredAreas.map((a, i) => (
                  <tr key={a.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                    <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">{i + 1}</td>
                    <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{a.name_ar}</td>
                    <td className="px-5 py-3 text-xs text-[#8FA3B8]">{a.governorate ?? "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs">{a.active_reports_count ?? 0}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="relative inline-block">
                        <button onClick={() => setActionMenuId(actionMenuId === a.id ? null : a.id)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] transition-colors cursor-pointer">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        {actionMenuId === a.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setActionMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 z-30 w-36 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                              <button onClick={() => { setActionMenuId(null); openEditModal(a); }} className="w-full px-3 py-1.5 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] transition-colors">Edit</button>
                              <button onClick={() => { setActionMenuId(null); setDeleteTarget(a); }} className="w-full px-3 py-1.5 text-left text-xs text-[#D49088] hover:bg-[#243040] transition-colors">Remove</button>
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
