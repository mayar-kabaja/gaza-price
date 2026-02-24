"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { HomeData } from "./HomeData";

const SPLASH_MS = 1800;

/** First time (no onboarding_done): show splash then redirect to onboarding. Otherwise show HomeData. */
export function FirstVisitGate() {
  const router = useRouter();
  const [phase, setPhase] = useState<"pending" | "splash" | "home">("pending");
  const redirected = useRef(false);

  useEffect(() => {
    const done = typeof window !== "undefined" && localStorage.getItem(LOCAL_STORAGE_KEYS.onboarding_done);
    const id = requestAnimationFrame(() => {
      if (done) {
        setPhase("home");
        return;
      }
      setPhase("splash");
    });
    if (done) return () => cancelAnimationFrame(id);
    const t = setTimeout(() => {
      if (redirected.current) return;
      redirected.current = true;
      router.replace("/onboarding");
    }, SPLASH_MS);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(t);
    };
  }, [router]);

  if (phase === "pending") {
    return <div className="min-h-dvh bg-fog" aria-hidden="true" />;
  }
  if (phase === "splash") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-ink overflow-hidden">
        <div className="absolute w-[200px] h-[200px] rounded-full bg-olive/15 -top-14 -left-14" />
        <div className="absolute w-[150px] h-[150px] rounded-full bg-sand/10 -bottom-8 -right-10" />
        <div className="relative z-10 text-center">
          <h1 className="font-display font-extrabold text-[2.8rem] text-white leading-none">
            غزة <span className="text-sand">بريس</span>
          </h1>
          <p className="text-sm text-white/45 mt-2.5 font-body">أسعار شفافة · قوة المجتمع</p>
        </div>
        <LoaderDots className="relative z-10 mt-10" variant="light" />
        <p className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-white/20 font-mono z-10">
          initializing session...
        </p>
      </div>
    );
  }

  return <HomeData />;
}
