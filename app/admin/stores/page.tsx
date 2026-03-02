"use client";

import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";
import { EditIcon, RemoveIcon } from "@/components/admin/AdminActionIcons";

type Area = {
  id: string;
  name_ar: string;
};

type Store = {
  id: string;
  name_ar: string;
  area_id?: string;
  area?: { id: string; name_ar: string };
  is_verified?: boolean;
  created_at?: string;
};

const FORM_EMPTY = { name_ar: "", area_id: "", is_verified: false };

export default function AdminStoresPage() {
  const { toast } = useAdminToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [formSaving, setFormSaving] = useState(false);
  const [showFormConfirm, setShowFormConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/stores")
      .then((r) => r.json())
      .then((d) => setStores(Array.isArray(d) ? d : []))
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    fetch("/api/areas")
      .then((r) => r.json())
      .then((d) => setAreas(d?.areas ?? []))
      .catch(() => setAreas([]));
  }, []);

  function openAddModal() {
    setFormMode("add");
    setEditingStore(null);
    setForm(FORM_EMPTY);
    setShowFormConfirm(false);
    setShowFormModal(true);
  }

  function openEditModal(store: Store) {
    setFormMode("edit");
    setEditingStore(store);
    setForm({
      name_ar: store.name_ar ?? "",
      area_id: store.area_id ?? store.area?.id ?? "",
      is_verified: store.is_verified ?? false,
    });
    setShowFormConfirm(false);
    setShowFormModal(true);
  }

  function handleFormSubmit() {
    if (!form.name_ar?.trim()) {
      toast("الاسم بالعربية مطلوب", "error");
      return;
    }
    if (!form.area_id?.trim()) {
      toast("يرجى اختيار المنطقة", "error");
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
      area_id: form.area_id,
      is_verified: form.is_verified,
    };

    try {
      if (formMode === "add") {
        const res = await fetch("/api/admin/stores", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data?.message ?? "فشل الإضافة", "error");
          return;
        }
        toast("تمت إضافة المتجر بنجاح", "success");
      } else if (editingStore) {
        const res = await fetch(`/api/admin/stores/${editingStore.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data?.message ?? "فشل التحديث", "error");
          return;
        }
        toast("تم تحديث المتجر بنجاح", "success");
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
      const res = await fetch(`/api/admin/stores/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast("تم حذف المتجر بنجاح", "success");
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

  const filteredStores = search.trim()
    ? stores.filter(
        (s) =>
          (s.name_ar?.toLowerCase() ?? "").includes(search.trim().toLowerCase()) ||
          (s.area?.name_ar?.toLowerCase() ?? "").includes(search.trim().toLowerCase())
      )
    : stores;

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="mb-4 flex flex-nowrap gap-2 sm:gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stores..."
          className="flex-1 min-w-0 rounded-lg border border-[#243040] bg-[#18212C] px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
        />
        <button
          onClick={openAddModal}
          className="flex-shrink-0 rounded-lg bg-[#4A7C59] px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#3A6347]"
        >
          + Add Store
        </button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#4E6070]">
            {search.trim() ? "No stores match your search." : "No stores"}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-[#243040]">
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-12">#</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Store</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Area</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Verified</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStores.map((s, i) => (
                  <tr key={s.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                    <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">{i + 1}</td>
                    <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{s.name_ar}</td>
                    <td className="px-5 py-3 text-xs text-[#8FA3B8]">{s.area?.name_ar ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
                        s.is_verified
                          ? "border-[#4A7C5935] bg-[#4A7C5920] text-[#6BA880]"
                          : "border-[#64748B35] bg-[#334155] text-[#94A3B8]"
                      }`}>
                        {s.is_verified ? "✓ Verified" : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 flex-wrap items-center">
                        <button onClick={() => openEditModal(s)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#64748B] bg-[#334155] px-3 py-1.5 text-xs font-medium text-[#94A3B8] hover:bg-[#475569] hover:border-[#64748B] transition-colors"><EditIcon />Edit</button>
                        <button onClick={() => setDeleteTarget(s)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#A85852] bg-[#A8585218] px-3 py-1.5 text-xs font-medium text-[#D49088] hover:bg-[#A8585228] hover:border-[#A85852] transition-colors"><RemoveIcon />Remove</button>
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
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-4">{formMode === "add" ? "Add Store" : "Edit Store"}</h3>
            {!showFormConfirm ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Name (Arabic) *</label>
                    <input type="text" value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]" placeholder="اسم المتجر" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Area *</label>
                    <select value={form.area_id} onChange={(e) => setForm((f) => ({ ...f, area_id: e.target.value }))} className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]">
                      <option value="">اختر المنطقة</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>{a.name_ar}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="store-verified" checked={form.is_verified} onChange={(e) => setForm((f) => ({ ...f, is_verified: e.target.checked }))} className="rounded" />
                    <label htmlFor="store-verified" className="text-sm text-[#8FA3B8]">Verified</label>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={() => setShowFormModal(false)} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040]">Cancel</button>
                  <button type="button" onClick={handleFormSubmit} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]">{formMode === "add" ? "Add Store" : "Save Changes"}</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[#D8E4F0] mb-4">{formMode === "add" ? "Are you sure you want to add this store?" : "Are you sure you want to save these changes?"}</p>
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
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-2">Remove Store</h3>
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
