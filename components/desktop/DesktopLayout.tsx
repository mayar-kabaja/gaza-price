"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useArea } from "@/hooks/useArea";
import { useSectionsWithCategories, useAreas } from "@/lib/queries/hooks";

const DesktopHeader = dynamic(() => import("@/components/desktop/DesktopHeader").then(m => ({ default: m.DesktopHeader })), { ssr: false });
const DesktopSidebar = dynamic(() => import("@/components/desktop/DesktopSidebar").then(m => ({ default: m.DesktopSidebar })), { ssr: false });
const DesktopSubmitModal = dynamic(() => import("@/components/desktop/DesktopSubmitModal").then(m => ({ default: m.DesktopSubmitModal })), { ssr: false });
const DesktopSuggestModal = dynamic(() => import("@/components/desktop/DesktopSuggestModal").then(m => ({ default: m.DesktopSuggestModal })), { ssr: false });

export function DesktopLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { area } = useArea();
  const { data: sections } = useSectionsWithCategories();
  useAreas();

  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);

  const sortedCategories = (sections ?? []).flatMap((s) => s.categories ?? []);
  const firstCategoryId = sortedCategories[0]?.id ?? null;

  return (
    <div className="h-screen grid grid-rows-[64px_1fr]">
      <DesktopHeader
        onSubmitClick={() => setSubmitModalOpen(true)}
        onSuggestClick={() => setSuggestModalOpen(true)}
        onProfileClick={() => router.push("/account")}
        isProfileActive={pathname === "/account"}
      />
      <div className="flex overflow-hidden">
        <DesktopSidebar
          selectedAreaId={area?.id ?? null}
          selectedCategoryId={firstCategoryId}
          onAreaSelect={(a) => router.push(`/?area=${a.id}`)}
          onCategorySelect={(id) => router.push(`/?category=${id}`)}
          onSubmitClick={() => setSubmitModalOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-8 bg-fog">
          {children}
        </main>
      </div>
      <DesktopSubmitModal open={submitModalOpen} onClose={() => setSubmitModalOpen(false)} />
      <DesktopSuggestModal open={suggestModalOpen} onClose={() => setSuggestModalOpen(false)} />
    </div>
  );
}
