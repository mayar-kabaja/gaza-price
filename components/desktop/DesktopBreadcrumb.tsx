"use client";

import { useSectionsWithCategories } from "@/lib/queries/hooks";

interface DesktopBreadcrumbProps {
  categoryId: string | null;
}

export function DesktopBreadcrumb({ categoryId }: DesktopBreadcrumbProps) {
  const { data: sections } = useSectionsWithCategories();

  let sectionName: string | undefined;
  let categoryName: string | undefined;

  if (categoryId && sections) {
    for (const section of sections) {
      const cat = (section.categories ?? []).find((c) => c.id === categoryId);
      if (cat) {
        sectionName = section.name_ar;
        categoryName = cat.name_ar;
        break;
      }
    }
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-mist font-body mb-6">
      <span>الرئيسية</span>
      {sectionName && (
        <>
          <span className="text-border">‹</span>
          <span>{sectionName}</span>
        </>
      )}
      {categoryName && (
        <>
          <span className="text-border">‹</span>
          <span>{categoryName}</span>
        </>
      )}
    </nav>
  );
}
