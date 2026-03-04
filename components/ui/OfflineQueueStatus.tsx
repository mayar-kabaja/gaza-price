"use client";

import { useState, useEffect } from "react";

interface OfflineQueueStatusProps {
  pendingCount: number;
  isSyncing: boolean;
  onSync: () => void;
}

export function OfflineQueueStatus({ pendingCount, isSyncing, onSync }: OfflineQueueStatusProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [prevCount, setPrevCount] = useState(pendingCount);

  // Detect when all reports have been synced
  useEffect(() => {
    if (prevCount > 0 && pendingCount === 0 && !isSyncing) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevCount(pendingCount);
  }, [pendingCount, isSyncing, prevCount]);

  if (!showSuccess && pendingCount === 0) return null;

  const label =
    pendingCount === 1
      ? "تقرير واحد في الانتظار"
      : pendingCount === 2
        ? "تقريران في الانتظار"
        : `${pendingCount} تقارير في الانتظار`;

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        bottom: 72,
        left: 12,
        right: 12,
        zIndex: 9990,
        background: showSuccess ? "#166534" : "#92400E",
        color: "#fff",
        borderRadius: "12px",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "13px",
        fontWeight: 600,
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
      }}
    >
      {showSuccess ? (
        <span style={{ flex: 1 }}>تم إرسال جميع التقارير</span>
      ) : (
        <>
          <span style={{ flex: 1 }}>
            {isSyncing ? "جاري الإرسال..." : label}
          </span>
          <button
            onClick={onSync}
            disabled={isSyncing}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              borderRadius: "8px",
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: isSyncing ? "not-allowed" : "pointer",
              opacity: isSyncing ? 0.6 : 1,
            }}
          >
            {isSyncing ? "⏳" : "إرسال الآن"}
          </button>
        </>
      )}
    </div>
  );
}
