"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Area = {
  id: string;
  name_ar: string;
  governorate?: string | null;
  active_reports_count?: number;
};

type Store = {
  id: string;
  name_ar: string;
  area_id?: string;
  area?: { id: string; name_ar: string };
  is_verified?: boolean;
  created_at?: string;
};

type Tab = "areas" | "stores";

export default function AdminAreasStoresPage() {
  const [tab, setTab] = useState<Tab>("areas");
  const [areas, setAreas] = useState<Area[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab === "areas") {
      setLoading(true);
      fetch("/api/areas")
        .then((r) => r.json())
        .then((d) => setAreas(d?.areas ?? []))
        .finally(() => setLoading(false));
    } else {
      setLoading(true);
      fetch("/api/stores")
        .then((r) => r.json())
        .then((d) => setStores(Array.isArray(d) ? d : []))
        .finally(() => setLoading(false));
    }
  }, [tab]);

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setTab("areas")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === "areas"
                ? "bg-[#4A7C59] text-white"
                : "border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:text-[#D8E4F0]"
            )}
          >
            Areas
          </button>
          <button
            onClick={() => setTab("stores")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === "stores"
                ? "bg-[#4A7C59] text-white"
                : "border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:text-[#D8E4F0]"
            )}
          >
            Stores
          </button>
        </div>
        <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            </div>
          ) : tab === "areas" ? (
            areas.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#4E6070]">No areas</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#243040]">
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Area</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Governorate</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Active Reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areas.map((a) => (
                      <tr key={a.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                        <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{a.name_ar}</td>
                        <td className="px-5 py-3 text-xs text-[#8FA3B8]">{a.governorate ?? "—"}</td>
                        <td className="px-5 py-3 font-mono text-xs">{a.active_reports_count ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : stores.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4E6070]">No stores</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#243040]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Store</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Area</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((s) => (
                    <tr key={s.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                      <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{s.name_ar}</td>
                      <td className="px-5 py-3 text-xs text-[#8FA3B8]">{s.area?.name_ar ?? "—"}</td>
                      <td className="px-5 py-3 text-xs">{s.is_verified ? "✓" : "—"}</td>
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
