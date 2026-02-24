"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SuggestContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name")?.trim() ?? "";

  return (
    <div className="flex flex-col min-h-dvh">
      <div className="bg-olive px-5 pt-5 pb-6 flex-shrink-0">
        <h1 className="font-display font-extrabold text-xl text-white">اقترح منتجاً جديداً</h1>
        <p className="text-sm text-white/70 mt-1 font-body">
          لم نجد هذا المنتج في القائمة. يمكنك اقتراحه للمراجعة.
        </p>
      </div>
      <div className="flex-1 p-5 space-y-4">
        {name ? (
          <>
            <div className="bg-white rounded-xl border border-border p-4">
              <div className="text-xs font-bold text-mist uppercase tracking-wider mb-1">المنتج المقترح</div>
              <div className="font-display font-bold text-ink text-lg">{name}</div>
            </div>
            <p className="text-sm text-mist font-body">
              سنراجع اقتراحك ونضيف المنتج إن كان مناسباً. يمكنك أيضاً إضافة سعر لمنتج موجود من صفحة الإضافة.
            </p>
          </>
        ) : (
          <p className="text-sm text-mist font-body">لم يُحدد اسم منتج. ابحث في الشريط أعلاه ثم اختر «اقترح منتجاً جديداً» عند عدم ظهور النتائج.</p>
        )}
        <div className="flex gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 py-3 rounded-xl bg-olive text-white text-center font-display font-bold"
          >
            العودة للرئيسية
          </Link>
          <Link
            href="/submit"
            className="flex-1 py-3 rounded-xl border border-olive text-olive text-center font-display font-bold"
          >
            إضافة سعر
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuggestPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-fog flex items-center justify-center font-body text-mist">جاري التحميل...</div>}>
      <SuggestContent />
    </Suspense>
  );
}
