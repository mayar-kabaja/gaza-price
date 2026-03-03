import { Suspense } from "react";
import { FirstVisitGate } from "@/components/home/FirstVisitGate";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-fog" aria-hidden="true" />}>
      <FirstVisitGate />
    </Suspense>
  );
}
