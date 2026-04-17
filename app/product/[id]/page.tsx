"use client";

import { use } from "react";
import Link from "next/link";
import { useProduct } from "@/lib/queries/hooks";
import { ProductPricesSection } from "@/components/prices/ProductPricesSection";
import { BottomNav } from "@/components/layout/BottomNav";
import { useSearchParams } from "next/navigation";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useGlobalSidebar } from "@/components/layout/GlobalDesktopShell";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProductPage({ params }: Props) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const area = searchParams.get("area") ?? null;
  const isDesktop = useIsDesktop();

  const { data: product, isLoading, isError } = useProduct(id);

  useGlobalSidebar(
    isDesktop ? (
      <div className="space-y-1">
        <Link href="/" className="flex items-center gap-1.5 text-xs text-mist hover:text-olive transition-colors font-semibold mb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          الرئيسية
        </Link>
        {product && (
          <div className="bg-olive-pale rounded-xl p-3">
            <div className="font-display font-bold text-sm text-ink mb-0.5">{product.name_ar}</div>
            <div className="text-[11px] text-mist">
              {product.category?.icon} {product.category?.name_ar} · {product.unit_size} {product.unit}
            </div>
          </div>
        )}
      </div>
    ) : null
  );

  if (isLoading) {
    if (isDesktop) {
      return (
        <div className="h-full overflow-y-auto bg-fog">
          <div className="max-w-2xl mx-auto p-6 space-y-4">
            <div className="h-6 w-40 bg-border/40 rounded animate-pulse" />
            <div className="h-4 w-56 bg-border/40 rounded animate-pulse" />
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 rounded-[14px] bg-border/40 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="bg-olive px-5 pt-4 pb-5 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/" className="text-white/60 hover:text-white">←</Link>
            <div className="font-display font-extrabold text-xl text-white leading-none">
              غزة <span className="text-sand">بريس</span>
            </div>
          </div>
          <div className="h-5 w-32 bg-white/20 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className={`flex flex-col ${isDesktop ? "h-full" : "min-h-dvh"} items-center justify-center`}>
        <p className="text-mist font-body">المنتج غير موجود</p>
        <Link href="/" className="text-olive mt-2 font-body">← الرئيسية</Link>
      </div>
    );
  }

  // ── Desktop layout ──
  if (isDesktop) {
    return (
      <div className="h-full overflow-y-auto bg-fog" dir="rtl">
        <div className="max-w-2xl mx-auto p-6">
          {/* Product header */}
          <div className="mb-5">
            <h1 className="font-display font-bold text-lg text-ink">{product.name_ar}</h1>
            <div className="text-sm text-mist mt-0.5">
              {product.category?.icon} {product.category?.name_ar} · {product.unit_size} {product.unit}
            </div>
          </div>

          {/* Prices */}
          <ProductPricesSection
            productId={product.id}
            productName={product.name_ar}
            areaId={area}
          />
        </div>
      </div>
    );
  }

  // ── Mobile layout ──
  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <div className="bg-olive px-5 pt-4 pb-5 flex-shrink-0 relative overflow-hidden">
        <div className="absolute w-44 h-44 rounded-full bg-white/5 -bottom-14 -left-12 pointer-events-none" />
        <div className="flex items-center gap-3 mb-3 relative z-10">
          <Link href="/" className="text-white/60 hover:text-white">
            ←
          </Link>
          <div className="font-display font-extrabold text-xl text-white leading-none">
            غزة <span className="text-sand">بريس</span>
          </div>
        </div>
        <div className="relative z-10">
          <div className="font-display font-bold text-lg text-white">{product.name_ar}</div>
          <div className="text-sm text-white/60">
            {product.category?.icon} {product.category?.name_ar} · {product.unit_size} {product.unit}
          </div>
        </div>
      </div>

      {/* Prices */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-3 pb-24">
        <ProductPricesSection
          productId={product.id}
          productName={product.name_ar}
          areaId={area}
        />
      </div>

      {/* Submit FAB */}
      <Link
        href={`/submit?product_id=${product.id}`}
        className="fixed bottom-20 left-4 bg-olive text-white rounded-full px-4 py-2.5 text-sm font-display font-bold shadow-lg z-30"
      >
        ➕ أضف سعراً
      </Link>

      <BottomNav />
    </div>
  );
}
