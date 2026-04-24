"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { SubmitWizard } from "@/components/submit/SubmitWizard";

function SubmitPageInner() {
  const isDesktop = useIsDesktop();
  const router = useRouter();

  useEffect(() => {
    if (isDesktop) router.replace("/");
  }, [isDesktop, router]);

  return <SubmitWizard />;
}

export default function SubmitPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-fog flex items-center justify-center font-body text-mist">جاري التحميل...</div>}>
      <SubmitPageInner />
    </Suspense>
  );
}
