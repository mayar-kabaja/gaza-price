"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin-error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="text-5xl mb-4">🔧</div>
      <h1 className="font-bold text-lg text-gray-800 mb-2">
        خطأ في لوحة التحكم
      </h1>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        حدث خطأ أثناء تحميل هذه الصفحة.
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
