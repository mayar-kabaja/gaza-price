"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center bg-white">
      <div className="text-5xl mb-4">⚠️</div>
      <h1 className="font-display font-bold text-lg text-ink mb-2">
        حدث خطأ غير متوقع
      </h1>
      <p className="text-sm text-mist mb-6 max-w-xs">
        قد يكون السبب ضعف الاتصال بالإنترنت. حاول مرة أخرى.
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-6 py-2.5 rounded-xl bg-olive text-white font-display font-bold text-sm hover:bg-olive/90 transition-colors"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
