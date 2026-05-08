"use client";

import { use, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/fetch";

/* ─── Types ─── */
interface MenuItem {
  id?: string;
  name: string;
  price: number;
  available: boolean;
  description?: string | null;
}
interface MenuSection {
  name: string;
  items: MenuItem[];
}
interface PlaceInfo {
  id: string;
  name: string;
  area?: { name_ar: string };
  type: string;
  section: string;
}

/* ─── Page ─── */
export default function PlaceMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [place, setPlace] = useState<PlaceInfo | null>(null);
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [placeRes, menuRes] = await Promise.all([
          apiFetch(`/api/places/${id}`),
          apiFetch(`/api/places/${id}/menu?no_cache=1&_t=${Date.now()}`),
        ]);
        if (!placeRes.ok) { setError(true); setLoading(false); return; }
        const placeData = await placeRes.json();
        setPlace(placeData.data || placeData);
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          setSections(menuData.data || menuData || []);
        }
      } catch { setError(true); }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-olive border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-ink font-display">
        <p className="text-lg">لم يتم العثور على القائمة</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white" dir="rtl">
      <div className="max-w-[600px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display font-black text-2xl sm:text-3xl text-olive">{place.name}</h1>
          {place.area?.name_ar && (
            <p className="text-sm text-mist mt-1">{place.area.name_ar}</p>
          )}
        </div>

        {/* Menu */}
        {sections.length === 0 ? (
          <p className="text-center text-sm text-mist py-12">لا توجد قائمة اسعار بعد</p>
        ) : (
          <div className="space-y-8">
            {sections.map((sec) => (
              <section key={sec.name}>
                <h2 className="font-display font-bold text-sm text-olive border-b border-olive/20 pb-2 mb-3">
                  {sec.name}
                </h2>
                <div className="space-y-2">
                  {sec.items.map((item, idx) => (
                    <div
                      key={item.id || `${item.name}-${idx}`}
                      className={`flex items-baseline justify-between gap-3 ${!item.available ? "opacity-40" : ""}`}
                    >
                      <div className="min-w-0">
                        <span className="text-[13px] text-ink">{item.name}</span>
                        {item.description && (
                          <p className="text-[11px] text-mist mt-0.5">{item.description}</p>
                        )}
                      </div>
                      {item.available && Number(item.price) > 0 ? (
                        <span className="text-[13px] font-bold text-olive whitespace-nowrap flex-shrink-0">
                          {item.price} {String.fromCharCode(0x20AA)}
                        </span>
                      ) : item.available ? (
                        <span className="text-[11px] text-mist/40">--</span>
                      ) : (
                        <span className="text-[11px] text-red-400">غير متوفر</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Missing prices notice */}
        {sections.some((sec) => sec.items.some((item) => Number(item.price) === 0)) && (
          <p className="text-center text-[11px] text-mist/50 mt-8">
            بعض الاسعار لم تضف بعد من صاحب المحل
          </p>
        )}
      </div>
    </main>
  );
}
