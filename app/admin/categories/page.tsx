"use client";

import { useEffect, useState } from "react";

type Category = {
  id: string;
  name_ar: string;
  icon?: string;
  sort_order?: number;
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4E6070]">No categories</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#243040]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Icon</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Name</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                      <td className="px-5 py-3 text-lg">{c.icon ?? "—"}</td>
                      <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{c.name_ar}</td>
                      <td className="px-5 py-3 font-mono text-xs text-[#4E6070]">{c.sort_order ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  );
}
