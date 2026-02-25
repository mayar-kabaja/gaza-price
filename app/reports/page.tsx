"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ReportFilters, type ReportFilterValue } from "@/components/reports/ReportFilters";
import { ReportFeed } from "@/components/reports/ReportFeed";
import { BottomNav } from "@/components/layout/BottomNav";

const AREA_STORAGE_KEY = "gazaprice_area";

export default function ReportsPage() {
  const [filter, setFilter] = useState<ReportFilterValue>("all");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [hasArea, setHasArea] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AREA_STORAGE_KEY);
      if (raw) {
        const a = JSON.parse(raw) as { id?: string };
        if (a?.id) {
          setAreaId(a.id);
          setHasArea(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <div className="bg-olive px-5 pt-4 pb-5 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/" className="text-white/60 hover:text-white font-body text-sm">
            ←
          </Link>
          <div className="font-display font-extrabold text-xl text-white leading-none">
            غزة <span className="text-sand">بريس</span>
          </div>
        </div>
        <h1 className="font-display font-bold text-lg text-white mt-2">تقارير</h1>
        <p className="text-sm text-white/70 mt-0.5 font-body">ما يضيفه الناس الآن في غزة</p>
      </div>

      {/* Filters */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0 bg-fog/30">
        <ReportFilters value={filter} onChange={setFilter} hasArea={hasArea} />
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <ReportFeed filter={filter} areaId={filter === "my_area" ? areaId : null} />
      </div>

      <BottomNav />
    </div>
  );
}
