"use client";

import { use } from "react";
import Link from "next/link";
import { useProduct } from "@/lib/queries/hooks";
import { ProductPricesSection } from "@/components/prices/ProductPricesSection";
import { BottomNav } from "@/components/layout/BottomNav";
import { useSearchParams } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProductPage({ params }: Props) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const area = searchParams.get("area") ?? null;

  const { data: product, isLoading, isError } = useProduct(id);

  if (isLoading) {
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
      <div className="flex flex-col min-h-dvh items-center justify-center">
        <p className="text-mist font-body">المنتج غير موجود</p>
        <Link href="/" className="text-olive mt-2 font-body">← الرئيسية</Link>
      </div>
    );
  }

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
