'use client';

import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';

export default function FavoritesPage() {
  return (
    <div className="min-h-screen bg-fog" dir="rtl">
      <AppHeader hideActions hideSearch />

      <div className="flex flex-col items-center justify-center px-6 pt-32 pb-40 text-center">
        <div className="w-20 h-20 rounded-full bg-olive-pale flex items-center justify-center mb-5">
          <span className="text-[36px]">❤️</span>
        </div>
        <h1 className="font-display font-extrabold text-[22px] text-ink mb-2">المفضلة</h1>
        <p className="text-sm text-mist leading-relaxed mb-1">هذه الميزة قيد التطوير</p>
        <p className="text-xs text-mist/70 leading-relaxed mb-8">قريباً ستقدر تحفظ المحلات والمنتجات المفضلة عندك</p>
        <span className="inline-block bg-olive/10 text-olive text-[11px] font-bold px-4 py-2 rounded-full">قريباً 🚀</span>
      </div>

      <BottomNav />
    </div>
  );
}
