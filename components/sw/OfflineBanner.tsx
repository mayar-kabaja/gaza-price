"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#5C4A1E",
        color: "#F5E6C8",
        textAlign: "center",
        padding: "8px 16px",
        fontSize: "14px",
        fontWeight: 500,
        direction: "rtl",
      }}
    >
      أنت غير متصل بالإنترنت — تعرض بيانات محفوظة
    </div>
  );
}
